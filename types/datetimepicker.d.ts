declare module '@react-native-community/datetimepicker' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface DateTimePickerProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime';
    display?: 'default' | 'spinner' | 'compact' | 'inline';
    onChange?: (event: any, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    locale?: string;
    textColor?: string;
    accentColor?: string;
    themeVariant?: 'light' | 'dark';
    is24Hour?: boolean;
    minuteInterval?: number;
    style?: ViewStyle;
  }

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}
