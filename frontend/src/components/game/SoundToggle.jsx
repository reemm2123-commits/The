import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { soundEnabled, setSoundEnabled, startAmbient, sfx } from "@/lib/sound";

export const SoundToggle = () => {
  const { t } = useLang();
  const [on, setOn] = useState(soundEnabled);
  const toggle = () => {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
    if (next) { startAmbient(); sfx("pin"); }
  };
  return (
    <button data-testid="sound-toggle-btn" onClick={toggle} aria-label={t("sound")} title={t("sound")} className="btn-ghost rounded-full w-10 h-10 flex items-center justify-center">
      {on ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
};
