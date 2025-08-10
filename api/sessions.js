// api/sessions.js
export default function handler(req, res) {
  const sessions = [
    { id: 'pre_game_focus', title: 'Pre-Game Focus (2 min)', duration_seconds: 120 },
    { id: 'quick_breathing', title: 'Quick Breathing (1 min)', duration_seconds: 60 },
    { id: 'calm_reset', title: 'Calm Reset (3 min)', duration_seconds: 180 }
  ];
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(sessions));
}
