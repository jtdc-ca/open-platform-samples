## Example using React Native

### Instructions

> Note: All instructions assume the use of MacOS or Linux.

1. Ensure you have [Yarn](https://yarnpkg.com/getting-started/install) installed:

```bash
yarn --version
# Should return a version number, like "1.22.5"
```

2. Install all dependencies:

```bash
yarn install
```

3. If you haven't yet, follow the instructions on the [React Native website](https://reactnative.dev/docs/environment-setup) to setup your device for mobile development. This project does not use Expo CLI.

4. If you are targeting iOS:

```bash
cd ios && pod install && cd -
```

5. Build and run the application. You'll also want to run the BOWdometer app alongside this.

### Key differences from React Native template

- Installed `react-native-auth0` for authentication, and `axios` for API requests
- Configured Android and iOS builds to handle redirects from Auth0
  - See [Auth0 quickstart](https://auth0.com/docs/quickstart/native/react-native#integrate-auth0-in-your-application) for details
  - Use `bowdometer.us.auth0.com` as the domain
  - Once you've set up your deep links, contact us to set up your Callback URLs and Logout URLs
- Modified the `App.tsx` to display the demo
- Other generic configurations related to React Native setup
  - The application ID for both platforms was set to `com.toxontech.sampleapp`
