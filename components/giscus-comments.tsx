"use client"

import Giscus from "@giscus/react";
import websiteConfig from "@/build/fixtures/website-config.json";
import { useTheme } from "nextra-theme-docs";

export default function CommentSection() {
  const { theme } = useTheme();
  const giscusTheme =
    theme === "dark"
      ? "dark"
      : theme === "light"
      ? "light"
      : "preferred_color_scheme";

  const repo = websiteConfig.repo;
  const repo_id = websiteConfig.repo_id;
  const category_id = websiteConfig.category_id;
  const category = websiteConfig.category;

  return (
    <div>
      {repo && repo_id && category && category_id ? (
        <Giscus
          repo={repo as `${string}/${string}`}
          repoId={repo_id}
          category={category}
          categoryId={category_id}
          strict="1"
          mapping="url"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={giscusTheme}
        />
      ) : null}
    </div>
  );
}
