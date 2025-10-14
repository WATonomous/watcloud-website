import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Code, Pre } from "nextra/components";

const introPlaceholder = "Hi WATcloud compute cluster users, This is a maintenance announcement. Please see below for details.";

function formatTime(dateString: string, tzLabel: string): string {
  if (dateString) {
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const weekday = dateObj.toLocaleString('en-US', { weekday: 'long' });
      const timeString = dateObj.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${weekday}, ${yyyy}-${mm}-${dd} ${timeString} (${tzLabel})`;
    } else {
      return `${dateString} (${tzLabel})`;
    }
  }
  return "";
}

function formatPlainText({
  intro,
  services,
  startTime,
  durationHours,
  durationMinutes,
  purpose,
  additional,
  contact,
}: {
  intro: string;
  services: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  purpose: string;
  additional: string;
  contact: string;
}) {
  let formattedStartTime = formatTime(startTime, 'ET');
  const additionalSection = additional.trim()
    ? `\n\nADDITIONAL INFORMATION:\n${additional.trim()}`
    : "";
  // Custom duration string
  let durationString = "";
  if (durationHours && durationMinutes) {
    durationString = `${durationHours} hour${durationHours !== 1 ? 's' : ''} ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
  } else if (durationHours) {
    durationString = `${durationHours} hour${durationHours !== 1 ? 's' : ''}`;
  } else if (durationMinutes) {
    durationString = `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
  } else {
    durationString = "N/A";
  }
  return `${intro}\n\nSERVICES AFFECTED:\n${services}\n\nSTART TIME:\n${formattedStartTime}\n\nDURATION:\n${durationString}\n\nPURPOSE:\n${purpose}${additionalSection}\n\n------------------------------------------------------------\nIf you have any questions or concerns, please contact: ${contact}`;
}

function formatMarkdown({
  intro,
  services,
  startTime,
  durationHours,
  durationMinutes,
  purpose,
  additional,
  contact,
}: {
  intro: string;
  services: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  purpose: string;
  additional: string;
  contact: string;
}) {
  let formattedStartTime = formatTime(startTime, 'ET');
  // Custom duration string
  let durationString = "";
  if (durationHours && durationMinutes) {
    durationString = `${durationHours} hour${durationHours !== 1 ? 's' : ''} ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
  } else if (durationHours) {
    durationString = `${durationHours} hour${durationHours !== 1 ? 's' : ''}`;
  } else if (durationMinutes) {
    durationString = `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`;
  } else {
    durationString = "N/A";
  }
  const additionalSection = additional.trim()
    ? `\n\n**ADDITIONAL INFORMATION:**\n${additional.trim()}`
    : "";
  return `**${intro}**\n\n**SERVICES AFFECTED:**\n${services}\n\n**START TIME:**\n${formattedStartTime}\n\n**DURATION:**\n${durationString}\n\n**PURPOSE:**\n${purpose}${additionalSection}\n\n------------------------------------------------------------\nIf you have any questions or concerns, please contact: ${contact}`;
}

export default function MaintenanceEmailGenerator() {
  const [intro, setIntro] = useState(introPlaceholder);
  const [services, setServices] = useState("");
  // Set default start time to 7 days from now in Eastern Time
  const [startTime, setStartTime] = useState(() => {
    try {
      // Get current time in ET
      const now = new Date();
      const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
      // Add 7 days
      etNow.setDate(etNow.getDate() + 7);
      // Set to 0th minute
      etNow.setMinutes(0, 0, 0);
      // Format as YYYY-MM-DDTHH:mm
      const yyyy = etNow.getFullYear();
      const mm = String(etNow.getMonth() + 1).padStart(2, '0');
      const dd = String(etNow.getDate()).padStart(2, '0');
      const hh = String(etNow.getHours()).padStart(2, '0');
      const min = String(etNow.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      return "";
    }
  });
  const [startTimeError, setStartTimeError] = useState<string>("");
  const [startTimeWarning, setStartTimeWarning] = useState<string>("");

  // Validate startTime is in the future
  React.useEffect(() => {
    if (!startTime) {
      setStartTimeError("");
      setStartTimeWarning("");
      return;
    }
    const inputDate = new Date(startTime);
    const now = new Date();
    if (inputDate.getTime() <= now.getTime()) {
      setStartTimeError("Start time must be in the future.");
    } else {
      setStartTimeError("");
    }

    // Check if start time is too close
    const today = new Date();
    const diffMs = inputDate.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Using 6 instead of 7 here so that scheduling exactly 7 days ahead (same weekday next week) does not trigger the warning
    if (diffDays >= 0 && diffDays < 6) {
      setStartTimeWarning("Warning: The selected start time is within a week of today. Short notice may impact user experience.");
    } else {
      setStartTimeWarning("");
    }
  }, [startTime]);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [durationWarning, setDurationWarning] = useState("");

  // Warn if duration > 6 hours
  React.useEffect(() => {
    const totalHours = durationHours + durationMinutes / 60;
    if (totalHours > 6) {
      setDurationWarning("Warning: Extended maintenance windows (over 6 hours) can significantly impact user experience. Consider minimizing downtime if possible.");
    } else {
      setDurationWarning("");
    }
  }, [durationHours, durationMinutes]);
  const [purpose, setPurpose] = useState("");
  const [additional, setAdditional] = useState("");
  const [contact, setContact] = useState("infra-outreach@watonomous.ca");

  const plainTextEmail = formatPlainText({
    intro,
    services,
    startTime,
    durationHours,
    durationMinutes,
    purpose,
    additional,
    contact,
  });

  const markdownDiscord = formatMarkdown({
    intro,
    services,
    startTime,
    durationHours,
    durationMinutes,
    purpose,
    additional,
    contact,
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={e => e.preventDefault()}
      >
        <div>
          <Label htmlFor="intro">Intro</Label>
          <Textarea
            id="intro"
            value={intro}
            onChange={e => setIntro(e.target.value)}
            placeholder={introPlaceholder}
            rows={2}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="services">Services Affected</Label>
          <div className="text-sm text-muted-foreground mb-1">
            Only list user-facing services (e.g., login nodes, wato-drive) or services affected by large-scale changes. For changes to scheduled (e.g., slurm nodes) or fault-tolerant (e.g., Ceph) resources, listing is usually not necessary (when following the standard procedures) unless it has a non-trivial chance of affecting users.
          </div>
          <Textarea
            id="services"
            value={services}
            onChange={e => setServices(e.target.value)}
            placeholder="e.g. tr-ubuntu1, thor-ubuntu1"
            rows={2}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <div className="text-sm text-muted-foreground mb-1">Start time of the maintenance window (Eastern Time)</div>
          <Input
            id="startTime"
            type="datetime-local"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="mt-1"
            required
          />
          {startTimeError && (
            <div className="text-sm text-red-600 mt-1">{startTimeError}</div>
          )}
          {startTimeWarning && !startTimeError && (
            <div className="text-sm text-yellow-600 mt-1">{startTimeWarning}</div>
          )}
        </div>
        <div>
          <Label>Duration</Label>
          <div className="flex gap-2 items-center mt-1">
            <Input
              id="duration-hours"
              type="number"
              min={0}
              value={durationHours}
              onChange={e => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24"
              required
            />
            <span>hour(s)</span>
            <Input
              id="duration-minutes"
              type="number"
              min={0}
              max={59}
              value={durationMinutes}
              onChange={e => setDurationMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-24"
              required
            />
            <span>minute(s)</span>
          </div>
          {durationWarning && (
            <div className="text-sm text-yellow-600 mt-1">{durationWarning}</div>
          )}
        </div>
        <div>
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="e.g. To upgrade wato-wato3 RAM."
            rows={2}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="additional">Additional Information</Label>
          <Textarea
            id="additional"
            value={additional}
            onChange={e => setAdditional(e.target.value)}
            placeholder="Any additional notes"
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="contact">Contact</Label>
          <div className="text-sm text-muted-foreground mb-1">
            If you have any questions or concerns, please contact:
          </div>
          <Input
            id="contact"
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="e.g. infra-outreach@watonomous.ca"
            required
            className="mt-1"
          />
        </div>

      </form>
      <h2 className="text-xl font-semibold mt-8 mb-2">Email (Plain Text)</h2>
      <Pre>
        <Code>
          {startTimeError ? "Please enter a valid future start time to generate the email." : plainTextEmail}
        </Code>
      </Pre>
      <h2 className="text-xl font-semibold mt-8 mb-2">Discord (Markdown)</h2>
      <Pre>
        <Code>
          {startTimeError ? "Please enter a valid future start time to generate the Discord message." : markdownDiscord}
        </Code>
      </Pre>
    </div>
  );
}