import argparse
import csv
import json
import yaml
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from directory.scripts.host_utils import get_host_config, get_group_config

def parse_colon_separated_file(s: str):
    lines = s.split("\n")

    data = {}
    for line in lines:
        if not line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()
    
    return data

def get_file_lines(data_path, host_name, file_name):
    file_path = Path(data_path, "general", host_name, file_name)
    if not file_path.exists():
        return []
    
    return [s.strip() for s in file_path.read_text().split("\n") if s.strip() != ""]

def get_cpu_info(data_path, host_name):
    cpu_info_path = Path(data_path, "general", host_name, "lscpu.log")
    if not cpu_info_path.exists():
        return {}

    cpu_info_str = cpu_info_path.read_text()
    cpu_info_dict = parse_colon_separated_file(cpu_info_str)
    return {
        "model": cpu_info_dict["Model name"],
        "logical_processors": cpu_info_dict["CPU(s)"],
        "threads_per_core": cpu_info_dict["Thread(s) per core"],
    }

def get_gpu_info(data_path, host_name):
    gpu_info_path = Path(data_path, "general", host_name, "nvidia-smi.csv")
    if not gpu_info_path.exists():
        return []
    
    with open(gpu_info_path, 'r') as file:
        reader = csv.DictReader(file, skipinitialspace=True)
        gpus = list(reader)
    
    return gpus

def get_memory_info(data_path, host_name):
    memory_info_path = Path(data_path, "general", host_name, "meminfo-total.log")
    if not memory_info_path.exists():
        return {}
    
    memory_info_str = memory_info_path.read_text()
    memory_info_dict = parse_colon_separated_file(memory_info_str)
    return {
        "memory_total_kibibytes": memory_info_dict["MemTotal"].split(" ")[0],
        "swap_total_kilobytes": memory_info_dict["SwapTotal"].split(" ")[0],
    }

def get_lsb_release_info(data_path, host_name):
    lsb_release_info_path = Path(data_path, "general", host_name, "lsb-release.log")
    if not lsb_release_info_path.exists():
        return {}
    
    lsb_release_info_str = lsb_release_info_path.read_text()
    lsb_release_info_dict = parse_colon_separated_file(lsb_release_info_str)
    return {
        "description": lsb_release_info_dict["Description"],
    }

def get_hosted_storage(data_path, host_name):
    exportfs_path = Path(data_path, "general", host_name, "exportfs.log")
    df_path = Path(data_path, "general", host_name, "df-total.log")
    if not exportfs_path.exists() or not df_path.exists():
        return []

    mount_to_size = {}
    df_log = df_path.read_text()
    for line_raw in df_log.split("\n"):
        line = line_raw.strip()
        if line == "":
            continue
        
        bytes, mountpoint = line.split(" ", 1)
        mount_to_size[mountpoint] = bytes
    
    exportfs_log = exportfs_path.read_text()
    exports = []
    for line_raw in exportfs_log.split("\n"):
        line = line_raw.strip()
        if line == "":
            continue
        
        if line not in mount_to_size:
            raise Exception(f"Mountpoint {line} not found in df log")
        
        exports.append({
            "mountpoint": line,
            "size_bytes": mount_to_size[line],
        })
    
    return exports

def get_mounts_with_quotas(host):
    mounts = host.get("mounts", [])
    mounts_with_quotas = []
    for mount in mounts:
        if mount.get("user_quota"):
            mounts_with_quotas.append({
                "name": mount["name"],
                "fstype": mount["fstype"],
                "mountpoint": mount["mountpoint"],
                "user_quota": mount["user_quota"],
            })
    return mounts_with_quotas

def get_lshw_info(data_path, host_name):
    lshw_json_path = Path(data_path, "general", host_name, "lshw.json")
    if not lshw_json_path.exists():
        return {}
    
    with open(lshw_json_path, 'r') as file:
        lshw_info = json.load(file)

    # if is list
    if isinstance(lshw_info, list):
        assert len(lshw_info) == 1, f"Expected 1 lshw info, got {len(lshw_info)}. File: {lshw_json_path}"
        lshw_info = lshw_info[0]

    return lshw_info

def generate_fixtures(data_path):
    host_config = get_host_config()

    slurm_compute_nodes = []
    slurm_login_nodes = []
    bare_metals = []

    for host in host_config["hosts"]:
        name = host["name"]
        group_names = [g["name"] for g in host["groups"]]
        tags = []
        lshw_info = get_lshw_info(data_path, name)
        if lshw_info.get("vendor") == "QEMU":
            tags.append({
                "name": "VM",
                "description": f"{name} is a virtual machine",
            })

        node_tags = (get_group_config(host, "tagged_nodes") or {}).get("tags", [])

        properties = {
            "name": name,
            "tags": tags,
        }

        if "slurmd_nodes" in group_names:
            slurmd_config = get_group_config(host, "slurmd_nodes")
            if slurmd_config["slurm_role"] == "compute":
                properties.update({
                    "cpu_info": get_cpu_info(data_path, name),
                    "memory_info": get_memory_info(data_path, name),
                    "gpus": get_gpu_info(data_path, name),
                    "hostnames": [r["name"] for n in host["networks"] for r in n.get("dns_records",[])],
                    "lsb_release_info": get_lsb_release_info(data_path, name),
                })
                slurm_compute_nodes.append(properties)
            elif slurmd_config["slurm_role"] == "login":
                assert "login_nodes" in group_names, f"{name} is a SLURM login node but is not in a login node group"
                login_nodes_config = get_group_config(host, "login_nodes")
                properties.update({
                    "cpu_info": get_cpu_info(data_path, name),
                    "memory_info": get_memory_info(data_path, name),
                    "gpus": get_gpu_info(data_path, name),
                    "hostnames": [r["name"] for n in host["networks"] for r in n.get("dns_records",[])],
                    "lsb_release_info": get_lsb_release_info(data_path, name),
                    "ssh_host_keys": get_file_lines(data_path, name, "ssh-host-keys.log"),
                    "mounts_with_quotas": get_mounts_with_quotas(host),
                    "cpu_quota": login_nodes_config.get("cpu_quota"),
                    "memory_quota": login_nodes_config.get("memory_max"),
                })
                slurm_login_nodes.append(properties)
        elif "bare_metal_nodes" in group_names:
            properties.update({
                "cpu_info": get_cpu_info(data_path, name),
                "memory_info": get_memory_info(data_path, name),
                "hosted_storage": get_hosted_storage(data_path, name),
            })
            bare_metals.append(properties)

    return {
        "machines": {
            "slurm_compute_nodes": sorted(slurm_compute_nodes, key=lambda m: int(m["cpu_info"].get("logical_processors", 0)), reverse=True),
            "slurm_login_nodes": sorted(slurm_login_nodes, key=lambda m: int(m["cpu_info"].get("logical_processors", 0)), reverse=True),
            "bare_metals": sorted(bare_metals, key=lambda m: int(m["cpu_info"].get("logical_processors", 0)), reverse=True),
        },
        "global_user_disk_quotas": host_config["global_user_disk_quotas"],
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate machine info from gathered data')
    parser.add_argument('data_path', type=str, help='Path to data')
    parser.add_argument('fixtures_path', type=str, help='Path to fixtures')
    args = parser.parse_args()
    fixtures = generate_fixtures(args.data_path)
    with open(Path(args.fixtures_path, "machine-info.json"), 'w') as file:
        json.dump(fixtures, file, indent=2)
