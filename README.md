# Gut Over Matter

**Understanding IBS through the gut-brain loop.**

Gut Over Matter is a knowledge translation web app that explains irritable bowel syndrome (IBS) as a disorder of gut-brain interaction, in plain language. It turns peer-reviewed research and clinical guidelines into guided programs, nervous system regulation tools, science explainers, and Gut IQ, an assistant that answers questions about the science.

Created by Sara Khademal for HK*4510 Teaching, Learning and Knowledge Transfer, University of Guelph (faculty advisor: William Bettger).

This app is an educational resource. It is not medical advice and does not replace care from a clinician.

## What is inside

- **20 guided programs, 105 sessions** across five categories: Understand Your IBS, Calm the Loop, Rebuild Trust, Special Patterns, and Listen and Practice
- **13 Grow Your Gut IQ topics** with diagrams, plus a full scientific reference list
- **Tools:** Breathing Pacer (4-2-6 pattern, 6 breaths per minute), five read-along regulation scripts, Sleep Planner, Routine Builder, Cycle and Gut-Brain Tracker, and a 3-question starting-point quiz
- **Gut IQ:** a main chat and a "Reflect with Gut IQ" chat in every session
- **Support:** care-team question lists, red flags, and an anonymous suggestion box

## How it is built

Plain HTML, CSS and JavaScript (React 18, included in `vendor/`). No build step.

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `app.js` | The app: screens, programs, sessions, tools |
| `styles.css` | Page-level styles |
| `images/` | All illustrations, diagrams and app icons |
| `vendor/` | React and ReactDOM |
| `functions/api/chat.js` | Gut IQ live answers (runs on the host, not in the browser) |
| `functions/api/suggest.js` | Suggestion box (saves suggestions anonymously) |
| `_headers` | Security and caching settings for the host |
| `manifest.webmanifest` | Lets people add the app to their phone's home screen |

## Privacy and safety

- Everything a visitor saves (chats, sleep plan, routine, cycle dates) stays in their own browser.
- Gut IQ's live answers use the Claude API through `functions/api/chat.js`. The API key is stored as an encrypted secret on the hosting side and never appears in this repository or in the browser.
- Each visitor gets a small number of live answers per day, and the whole site has a daily ceiling. When a limit is reached, or if live answers are not set up, Gut IQ answers from its built-in science library instead.
