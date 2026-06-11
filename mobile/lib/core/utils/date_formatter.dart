import 'package:intl/intl.dart';

class DateFormatter {
  static final DateFormat _dayMonthYear = DateFormat('dd/MM/yyyy', 'pt_BR');
  static final DateFormat _dayMonthYearHour = DateFormat(
    'dd/MM/yyyy HH:mm',
    'pt_BR',
  );

  static String dayMonthYear(DateTime? date) {
    if (date == null) return '-';
    return _dayMonthYear.format(date.toLocal());
  }

  static String dayMonthYearHour(DateTime? date) {
    if (date == null) return '-';
    return _dayMonthYearHour.format(date.toLocal());
  }
}
