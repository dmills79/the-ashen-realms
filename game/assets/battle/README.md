# Forest combat artwork

- `forest_day.jpg`: forest image 3 extracted from the user-supplied `design-references/Wilderness Background and Battle UI.docx`; narrow black frame cropped, exported as JPEG. Integrated at its native resolution.
- `forest_evening.jpg`, `forest_night.jpg`: matching lighting edits made with the built-in ImageGen tool, inspected and exported as JPEG quality 90. Original generated PNGs remain in the generated-image cache; production copies are here.
- Character portraits and body sprites are preserved. Battlefield actors receive a subtle brightness/saturation adjustment matching forest illumination.

Final generation prompts (edit target: the supplied forest image; opaque wide landscape):

**Evening:** “Use case: lighting-weather. Edit target: supplied forest painting. Create a matching EVENING version for a fantasy RPG battle background. Preserve the exact wide composition, all tree trunks, roots, ruins and winding dirt path; no characters, lettering or interface. Change only illumination to low warm amber sunset filtering through the canopy, longer soft natural shadows and atmospheric depth. Premium realistic painterly forest. Keep ground clearly visible and remove the bottom black strip. Output wide landscape.”

**Night:** “Use case: lighting-weather. Edit target supplied forest painting. Create matching NIGHT forest battle environment. Preserve exact wide layout, every massive tree trunk, exposed root, ruined stone wall and winding natural dirt path. Change illumination only: cool blue moonlight filtering softly through the canopy; dark deep green foliage, subtle silver moonlit highlights and restrained mist. Remove all warm daylight and sunlight beams; keep path and foreground readable. No characters, UI, text or black bottom border. Premium realistic painterly fantasy, wide landscape.”

The game had no clock. Lighting therefore derives from existing saved journey steps: a 480-step cycle, day 0–239, transition to evening 240–279, evening 280–319, transition to night 320–359, night 360–439, transition to day 440–479. This is presentation only: no new timer, encounter roll, resource cost, or quest change. Steps stop during combat, so illumination stays stable throughout each encounter. Blended phases and actor grading use the same weights.
