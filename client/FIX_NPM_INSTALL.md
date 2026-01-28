# NPM Install Network Error - Solutions

## The Error
```
npm error code ECONNRESET
npm error network read ECONNRESET
```

This is a network/connection issue. Try these solutions in order:

## Solution 1: Clear NPM Cache (Most Common Fix)
```bash
npm cache clean --force
npm install
```

## Solution 2: Use Different Registry
```bash
npm config set registry https://registry.npmjs.org/
npm install
```

## Solution 3: Increase Timeout
```bash
npm config set fetch-timeout 60000
npm config set fetch-retries 5
npm install
```

## Solution 4: Disable Strict SSL (If behind corporate proxy)
```bash
npm config set strict-ssl false
npm install
```

## Solution 5: Use Yarn Instead
If npm keeps failing, try yarn:
```bash
# Install yarn globally (if not installed)
npm install -g yarn

# Then use yarn to install
yarn install
```

## Solution 6: Install Packages One by One
If all else fails, install one at a time:
```bash
npm install @react-pdf/renderer
npm install react-qr-code
npm install react-barcode
```

## Solution 7: Check Your Network
- Make sure you have internet connection
- Try disconnecting/reconnecting WiFi
- Check if you're behind a corporate firewall/proxy
- Try using a different network (mobile hotspot)

## Solution 8: Restart and Retry
Sometimes a simple restart helps:
1. Close all terminals
2. Restart your computer
3. Try `npm install` again

## After Successful Install
Once installed, restart your dev server:
```bash
npm run dev
```

## Still Having Issues?
If none of these work, you might need to:
1. Check your firewall settings
2. Configure proxy settings (if applicable)
3. Contact your network administrator (if on corporate network)
