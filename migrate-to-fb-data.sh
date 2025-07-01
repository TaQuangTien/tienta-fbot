#!/bin/bash

echo "Migrating to fb_data directory structure..."

mkdir -p fb_data

if [ -f "./proxies.json" ]; then
    cp ./proxies.json ./fb_data/
    echo "Copied existing proxies.json to fb_data/"
else
    echo "[]" > ./fb_data/proxies.json
    echo "Created empty proxies.json in fb_data/"
fi

if [ -f "./webhook-config.json" ]; then
    cp ./webhook-config.json ./fb_data/
    echo "Copied existing webhook-config.json to fb_data/"
else
    cat > ./fb_data/webhook-config.json << EOF
{
  "messageWebhookUrl": "",
  "eventWebhookUrl": ""
}
EOF
    echo "Created webhook-config.json template in fb_data/"
fi

if [ -d "./cookies" ]; then
    cp ./cookies/cred_*.json ./fb_data/ 2>/dev/null || true
    echo "Copied credential files to fb_data/"
else
    echo "No existing cookies directory found"
fi

echo "Migration completed. You can now run 'docker-compose up -d'"
echo "The old files are still in their original location and can be safely removed afterchamber confirming everything works."