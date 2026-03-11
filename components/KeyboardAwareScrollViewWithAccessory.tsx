/**
 * KeyboardAwareScrollView for screens that contain NumericMeasurementInput (or other
 * inputs that register accessory content). The accessory bar is rendered under the
 * header by KeyboardAccessoryHostUnderHeader in the root layout (Android).
 * This component is a passthrough to KeyboardAwareScrollView.
 */

import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { KeyboardAwareScrollView as KASVType } from 'react-native-keyboard-controller';

export type KeyboardAwareScrollViewWithAccessoryProps = React.ComponentPropsWithoutRef<
  typeof KeyboardAwareScrollView
>;

export const KeyboardAwareScrollViewWithAccessory = React.forwardRef<
  React.ElementRef<typeof KASVType>,
  KeyboardAwareScrollViewWithAccessoryProps
>(function KeyboardAwareScrollViewWithAccessory(props, ref) {
  return <KeyboardAwareScrollView ref={ref} {...props} />;
});
