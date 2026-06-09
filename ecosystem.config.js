// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "rental-room-system",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/home/ubuntu/rental-room-system",
      env_production: {
        NODE_ENV: "production",
      },
      // Load .env.production automatically
      env_file: "/home/ubuntu/rental-room-system/.env.production",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};