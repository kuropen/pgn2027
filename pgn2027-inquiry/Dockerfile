FROM dunglas/frankenphp:1-php8.4

RUN install-php-extensions pcntl pdo_sqlite mbstring intl zip
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /app
COPY . .
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
    && php artisan octane:install --server=frankenphp --no-interaction \
    && mkdir -p database/data \
    && chown -R www-data:www-data storage bootstrap/cache database/data /data /config
USER www-data
HEALTHCHECK NONE
EXPOSE 8000
ENTRYPOINT ["php", "artisan"]
CMD ["octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000", "--workers=2", "--max-requests=500"]

