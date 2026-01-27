const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix AppDelegate.swift by removing problematic property overrides
 * that conflict with ExpoAppDelegate in SDK 53+
 * 
 * This plugin runs after prebuild to ensure AppDelegate.swift doesn't have
 * the outdated manual React Native setup code.
 */
const withFixedAppDelegate = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'AppDelegate.swift'
      );

      if (fs.existsSync(appDelegatePath)) {
        let contents = fs.readFileSync(appDelegatePath, 'utf8');
        let modified = false;

        // Remove problematic property declarations
        if (contents.includes('var window: UIWindow?')) {
          contents = contents.replace(/^\s*var window: UIWindow\?\s*$/gm, '');
          modified = true;
        }
        if (contents.includes('var reactNativeDelegate:')) {
          contents = contents.replace(/^\s*var reactNativeDelegate: ExpoReactNativeFactoryDelegate\?\s*$/gm, '');
          modified = true;
        }
        if (contents.includes('var reactNativeFactory:')) {
          contents = contents.replace(/^\s*var reactNativeFactory: RCTReactNativeFactory\?\s*$/gm, '');
          modified = true;
        }

        // Remove problematic manual setup code
        if (contents.includes('bindReactNativeFactory') || contents.includes('let factory = ExpoReactNativeFactory')) {
          // Remove the entire manual setup block
          contents = contents.replace(
            /let delegate = ReactNativeDelegate\(\)[\s\S]*?factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)\s*#endif\s*/g,
            ''
          );
          // Also remove any remaining references
          contents = contents.replace(/reactNativeDelegate = delegate\s*/g, '');
          contents = contents.replace(/reactNativeFactory = factory\s*/g, '');
          contents = contents.replace(/bindReactNativeFactory\(factory\)\s*/g, '');
          contents = contents.replace(/window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*/g, '');
          modified = true;
        }

        // Clean up multiple blank lines
        contents = contents.replace(/\n\n\n+/g, '\n\n');

        if (modified) {
          fs.writeFileSync(appDelegatePath, contents, 'utf8');
        }
      }

      return config;
    },
  ]);
};

module.exports = (config) => {
  return withFixedAppDelegate(config);
};
