import os
import sys
import time
import re
import json
import requests
import pandas as pd
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- Konfiguration laden ---
def load_config(config_path):
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# --- App Gerüst ---
class FileProcessorHandler(FileSystemEventHandler):
    def __init__(self, qr_config, rechnungssteller_config):
        self.qr_config = qr_config
        self.rechnungssteller_config = rechnungssteller_config
        self.processed = False

    def on_any_event(self, event):
        if self.processed:
            return
        if event.is_directory:
            return
        # check if we have the needed files
        self.check_and_process()

    def check_and_process(self):
        print("Checking for files...")

        stammdaten_conf = self.qr_config.get("Stammdaten", {})
        rechnungs_conf = self.qr_config.get("Rechnungsdaten", {})

        stammdaten_path = self.find_latest_file(stammdaten_conf)
        rechnungs_path = self.find_latest_file(rechnungs_conf)

        if not stammdaten_path or not rechnungs_path:
            print("Stamm- oder Rechnungsdaten nicht gefunden.")
            return

        print(f"Stammdaten gefunden: {stammdaten_path}")
        print(f"Rechnungsdaten gefunden: {rechnungs_path}")

        self.process_files(stammdaten_path, rechnungs_path)
        self.processed = True

    def find_latest_file(self, conf):
        path = os.path.expanduser(conf.get("Path", "data"))
        if path.startswith("~") or not os.path.exists(path):
            path = "data"

        pattern = conf.get("Pattern", "")
        regex = re.compile(pattern)

        latest_file = None
        latest_time = 0

        if not os.path.exists(path):
            return None

        for filename in os.listdir(path):
            if regex.match(filename):
                filepath = os.path.join(path, filename)
                mtime = os.path.getmtime(filepath)
                if mtime > latest_time:
                    latest_time = mtime
                    latest_file = filepath

        return latest_file

    def process_files(self, stammdaten_path, rechnungs_path):
        print("Processing files...")

        # 1. Read Rechnungsdaten (CSV)
        # Skip 4 rows, tab separated, no header
        try:
            csv_df = pd.read_csv(rechnungs_path, sep='\t', skiprows=4, header=None)
            # Kolonne 0: Name, Kolonne 8: Betrag (Klient Anteil)
            rechnungen = csv_df[[0, 8]].dropna()
            rechnungen.columns = ['MatchName', 'Betrag']
            rechnungen['MatchName'] = rechnungen['MatchName'].str.strip()
        except Exception as e:
            print(f"Fehler beim Lesen der Rechnungsdaten: {e}")
            return

        # 2. Read Stammdaten (XLS)
        try:
            xls_df = pd.read_excel(stammdaten_path)
            # Create matching name
            # Handle NaN values in Name parts safely
            xls_df['MatchName'] = xls_df['Nachname'].fillna('') + ', ' + xls_df['Anrede'].fillna('') + ' ' + xls_df['Vorname'].fillna('')
            xls_df['MatchName'] = xls_df['MatchName'].str.strip()
        except Exception as e:
            print(f"Fehler beim Lesen der Stammdaten: {e}")
            return

        # 3. Merge Daten
        merged = pd.merge(rechnungen, xls_df, on='MatchName', how='inner')
        if merged.empty:
            print("Keine übereinstimmenden Klienten gefunden!")
            return

        # 4. Map to target ODS structure
        records = []
        for _, row in merged.iterrows():
            street_full = str(row.get('Strasse Nr.', ''))
            street_name = street_full
            street_no = ''

            # Extract street name and number
            match = re.match(r'^(.*?)\s+((?:\d+)[a-zA-Z]*)$', street_full.strip())
            if match:
                street_name = match.group(1)
                street_no = match.group(2)

            plz = str(row.get('PLZ', '')).replace('.0', '') if pd.notnull(row.get('PLZ')) else ''

            # File name e.g. Nachname_Vorname.pdf
            nachname = str(row.get('Nachname', '')).strip()
            vorname = str(row.get('Vorname', '')).strip()
            filename = f"{nachname}_{vorname}.pdf"

            records.append({
                'Lang': 'de',
                'IBAN': self.rechnungssteller_config.get('IBAN', ''),
                'Cdtr_AdrTp': 'S',
                'Cdtr_Name': f"{self.rechnungssteller_config.get('Vorname', '')} {self.rechnungssteller_config.get('Nachname', '')}".strip(),
                'Cdtr_StrtNmOrAdrLine1': self.rechnungssteller_config.get('Strasse', ''),
                'Cdtr_BldgNbOrAdrLine2': self.rechnungssteller_config.get('StrassenNr', ''),
                'Cdtr_PstCd': self.rechnungssteller_config.get('PLZ', ''),
                'Cdtr_TwnNm': self.rechnungssteller_config.get('Ort', ''),
                'Cdtr_Ctry': 'CH',
                'Amt': row['Betrag'],
                'Ccy': 'CHF',
                'UltmtDbtr_AdrTp': 'S',
                'UltmtDbtr_Name': f"{vorname} {nachname}".strip(),
                'UltmtDbtr_StrtNmOrAdrLine1': street_name,
                'UltmtDbtr_BldgNbOrAdrLine2': street_no,
                'UltmtDbtr_PstCd': plz,
                'UltmtDbtr_TwnNm': row.get('Ort', ''),
                'UltmtDbtr_Ctry': 'CH',
                'RefTp': 'NON',
                'Ref': '',
                'Ustrd': 'Klientenanteil Spitex',
                'StrdBkgInf': '',
                'AltPmt1': '',
                'AltPmt2': '',
                'FileName': filename,
                'Anrede': row.get('Anrede', ''),
                'Nummer': row.get('Klienten-Nr.', ''),
                'Email': ''
            })

        ods_df = pd.DataFrame(records)

        # 5. Save to ODS
        qr_conf = self.qr_config.get('QR-Rechnungen', {})
        out_path = os.path.expanduser(qr_conf.get('Path', 'data'))
        if out_path.startswith("~") or not os.path.exists(out_path):
            out_path = "data"

        ods_filename = "QR-Rechnungen-Result.ods" # from pattern usually, but hardcoded fallback
        ods_filepath = os.path.join(out_path, ods_filename)

        try:
            ods_df.to_excel(ods_filepath, index=False, engine='odf')
            print(f"ODS-Datei erfolgreich erstellt: {ods_filepath}")
        except Exception as e:
            print(f"Fehler beim Erstellen der ODS-Datei: {e}")
            return

        # 6. Send to Website (PDF creation)
        self.generate_pdfs(ods_filepath)

    def generate_pdfs(self, ods_filepath):
        print("Sende Daten an Website zur PDF-Erstellung...")
        url = "http://localhost:8080/api/pdf" # Placeholder URL
        try:
            with open(ods_filepath, 'rb') as f:
                files = {'file': (os.path.basename(ods_filepath), f, 'application/vnd.oasis.opendocument.spreadsheet')}
                response = requests.post(url, files=files)

            if response.status_code == 200:
                print("PDF erfolgreich erstellt!")
            else:
                print(f"Fehler bei der PDF-Erstellung. Status: {response.status_code}")
        except Exception as e:
            print(f"Fehler bei der Verbindung zum PDF-Service: {e}")

def main():
    qr_config_path = os.path.join("config", "SwissQRRechnung.json")
    rechnungssteller_path = os.path.join("config", "Rechnungssteller.json")

    qr_config = load_config(qr_config_path)
    rechnungssteller_config = load_config(rechnungssteller_path)

    handler = FileProcessorHandler(qr_config, rechnungssteller_config)

    # Observe all paths
    paths_to_watch = set()
    for key, val in qr_config.items():
        if "Path" in val:
            path = os.path.expanduser(val["Path"])
            # Fallback to local data folder if path doesn't exist for test purposes
            if path.startswith("~") or not os.path.exists(path):
                path = "data"
            paths_to_watch.add(path)

    observer = Observer()
    for path in paths_to_watch:
        if os.path.exists(path):
            observer.schedule(handler, path, recursive=False)

    # Run a first check immediately
    handler.check_and_process()
    if handler.processed:
        return

    observer.start()
    try:
        while not handler.processed:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
