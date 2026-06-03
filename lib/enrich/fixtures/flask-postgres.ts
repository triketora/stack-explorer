export const flaskPostgresRequest = {
  repo: "ledger",
  manifests: [
    { path: "requirements.txt", content: "Flask==3.0\nSQLAlchemy==2.0\npsycopg2-binary==2.9\ngunicorn==21" },
    { path: "Dockerfile", content: "FROM python:3.12" },
  ],
  tree: [
    { path: "server/app.py", size: 100 },
    { path: "server/api/accounts.py", size: 80 },
    { path: "server/models/user.py", size: 60 },
    { path: "Dockerfile", size: 30 },
  ],
};
