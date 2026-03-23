module.exports = {
  apps: [{
    name: 'api-service',
    script: 'dist/main.js',
    cwd: '/web/custody-openplatform/api-service',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 1000
    },
    error_file: '/web/custody-openplatform/logs/api-service-error.log',
    out_file: '/web/custody-openplatform/logs/api-service-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
}
