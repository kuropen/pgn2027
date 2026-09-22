#!/bin/sh

php artisan migrate --force
php artisan octane:start --server=frankenphp --caddyfile=/etc/caddy/Caddyfile --host=0.0.0.0 --port=8000
