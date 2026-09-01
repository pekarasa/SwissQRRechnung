import os
import unittest
from unittest.mock import patch
import pandas as pd
from app import FileProcessorHandler, load_config

class TestApp(unittest.TestCase):
    def setUp(self):
        self.qr_config_path = os.path.join("config", "SwissQRRechnung.json")
        self.rechnungssteller_path = os.path.join("config", "Rechnungssteller.json")
        self.qr_config = load_config(self.qr_config_path)
        self.rechnungssteller_config = load_config(self.rechnungssteller_path)

        self.qr_config["QR-Rechnungen"] = {"Pattern": "QR-Rechnungen-Result\\.csv"}

        self.handler = FileProcessorHandler(self.qr_config, self.rechnungssteller_config)
        self.expected_csv = os.path.join("data", "QR-Rechnungen.csv")
        self.output_csv = os.path.join("data", "QR-Rechnungen-Result.csv")

        # Ensure we remove the CSV file if it exists to test its creation
        if os.path.exists(self.output_csv):
            os.remove(self.output_csv)

    @patch('builtins.print')
    def test_stammdaten_not_found_message(self, mock_print):
        # Configure handler with non-matching pattern for stammdaten
        empty_config = {"Stammdaten": {"Path": "data", "Pattern": "non_matching_file_pattern_.*"}}
        handler = FileProcessorHandler(empty_config, self.rechnungssteller_config)
        handler.check_and_process()

        mock_print.assert_any_call("Stammdaten nicht gefunden.")
        mock_print.assert_any_call("Exportiere die aktuellen Stammdaten mit: „Weitere Aufgaben“ → „Liste + Auswertungen“ → „Klientendaten für elektronische Rechnungsübermittlung prüfen“")

    @patch('pandas.read_csv')
    @patch('pandas.read_excel')
    def test_missing_stammdaten_fails(self, mock_read_excel, mock_read_csv):
        # Setup mock Rechnungsdaten
        mock_csv_df = pd.DataFrame({
            0: ['Mustermann, Herr Max', 'Nicht Vorhanden'],
            8: [100.0, 50.0]
        })
        mock_read_csv.return_value = mock_csv_df

        # Setup mock Stammdaten
        mock_xls_df = pd.DataFrame({
            'Nachname': ['Mustermann'],
            'Vorname': ['Max'],
            'Anrede': ['Herr'],
            'MatchName': ['Max Mustermann'],
            'Strasse Nr.': ['Teststrasse 1'],
            'PLZ': [1234],
            'Ort': ['Testort'],
            'Klienten-Nr.': [1]
        })
        mock_read_excel.return_value = mock_xls_df

        with self.assertRaises(ValueError) as context:
            self.handler.process_files('dummy_stammdaten.xls', 'dummy_rechnungen.csv')

        self.assertEqual(str(context.exception), "Nicht alle Rechnungsdaten konnten in den Stammdaten gefunden werden!")

    def test_end_to_end_processing(self):
        # Find paths
        stammdaten_conf = self.qr_config.get("Stammdaten", {})
        rechnungs_conf = self.qr_config.get("Rechnungsdaten", {})
        stammdaten_path = self.handler.find_latest_file(stammdaten_conf)
        rechnungs_path = self.handler.find_latest_file(rechnungs_conf)

        self.assertIsNotNone(stammdaten_path, "Stammdaten (XLS) nicht gefunden")
        self.assertIsNotNone(rechnungs_path, "Rechnungsdaten (CSV) nicht gefunden")

        # Process files
        self.handler.process_files(stammdaten_path, rechnungs_path)

        # Verify CSV was created
        self.assertTrue(os.path.exists(self.output_csv), "CSV-Datei wurde nicht erstellt")

        # Read the CSV and verify content
        print(f"Generierte csv-Datei: {self.output_csv}")
        df_generated = pd.read_csv(self.output_csv, sep=',', encoding='cp1252')
        print(f"Erwartete csv-Datei: {self.expected_csv}")
        df_expected = pd.read_csv(self.expected_csv, sep=',', encoding='cp1252')

        self.assertGreater(len(df_generated), 0, "Die generierte csv-Datei ist leer")

        # Compare generated dataframe with expected dataframe
        pd.testing.assert_frame_equal(df_generated, df_expected)

if __name__ == '__main__':
    unittest.main()
