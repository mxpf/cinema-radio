# Audio transitions

Film changes use two audio decks with a three-second linear crossfade. The next film preloads during the final 30 seconds of the current slot. Station schedules subtract the overlap from each film's retained running time, keeping playback tied to a shared UTC schedule. The outgoing film's final seconds play under the incoming film; source files remain unchanged.

Sleep fades to silence over the final ten seconds of the selected timer, then powers off. Web Audio gain automation drives both fades independently of JavaScript timer frequency. Browsers without Web Audio use the periodic playback tick as a fallback. A delayed network load can still postpone a handoff; the incoming film joins its current scheduled position.

Validation includes the automated audio-clock suite and a Chrome playback check with two real media elements, overlapping gain ramps, sleep attenuation, and shutdown. The browser check uses short generated audio fixtures; it does not establish behavior under every operating system's background suspension policy.
