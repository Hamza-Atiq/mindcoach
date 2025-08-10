// api/session.js
// expects ?id=<session_id>
const SCRIPTS = {
  pre_game_focus: `Pre-Game Focus — 2 minutes.

Hi, I’m Nova. Let’s quickly center your attention for the game.
Find a comfortable stance, feet shoulder-width apart. Breathe in through your nose for 4 seconds — 1, 2, 3, 4. Hold for 2 seconds — 1, 2. Exhale slowly through your mouth for 6 seconds — 1, 2, 3, 4, 5, 6. (Repeat this cycle four times.)

Now, bring to mind one clear performance intention — a single thing you will focus on in this match. It could be "clean footwork" or "controlled breathing" — keep it simple.
On the next inhale, mentally say your intention once. When you exhale, release tension from your shoulders.

We will finish with three slow breaths. Inhale 4 — hold 2 — exhale 6. When you’re ready, open your eyes and bring the calm focus with you. Good luck — you’re ready.`,
  quick_breathing: `Quick Breathing — 1 minute.

Hi, Nova here. A one-minute reset.
Sit or stand straight. Close your eyes if it’s safe. Breathe in for 4 seconds — 1, 2, 3, 4. Pause 1 second. Exhale 5 seconds — 1, 2, 3, 4, 5. Repeat this 5 times.

Keep attention on the breath. If your mind wanders, gently return to the breath. Finish with one normal breath and notice how the body feels.`,
  calm_reset: `Calm Reset — 3 minutes.

Hello. This is a calm reset to recover focus.
Start with a gentle shoulder roll to release tension. Now place one hand on your chest and one hand on your belly. Breathe slowly: inhale for 4, exhale for 6. (Repeat three times.)

Scan your body from head to toes. With each breath out, soften an area that feels tight — shoulders, jaw, hands. Name it quietly ("shoulders"), and let it relax.

Now visualize a steady point — a spot on the horizon, a calm color, or a feeling of ease. Breathe toward that image. On your next exhale, say to yourself: "I am centered." Repeat twice.

When you finish, open your eyes slowly and bring the gentle calm into the next activity.`
};

export default function handler(req, res) {
  const id = req.query.id || 'pre_game_focus';
  const script = SCRIPTS[id] || '';
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ id, script }));
}
