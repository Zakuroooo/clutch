"use client";
/**
 * Read a card aloud with the browser's own voice (Web Speech API). No key, no server,
 * nothing leaves the device. An Indian English voice is used when the device has one.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.lang === "en-IN") ??
    voices.find((v) => v.lang.startsWith("en-GB")) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.rate = 1.02;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
