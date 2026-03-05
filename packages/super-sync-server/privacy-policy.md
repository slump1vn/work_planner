# Datenschutzerklärung

**Work Planner Sync**
_Stand: 08.12.2025_

## 1. Einleitung

Mit dieser Datenschutzerklärung informieren wir Sie über die Art, den Umfang und den Zweck der Verarbeitung personenbezogener Daten („Daten“) im Rahmen der Nutzung des Dienstes **Work Planner Sync**. Diese Erklärung erläutert außerdem Ihre Rechte gemäß der Datenschutz-Grundverordnung (DSGVO).

## 2. Verantwortlicher

**Johannes Millan**
Deutschland

E-Mail: contact@super-productivity.com

_(Weitere rechtliche Angaben finden Sie im Impressum der Website.)_

Ein Datenschutzbeauftragter ist nicht bestellt, da die gesetzlichen Voraussetzungen hierfür nicht vorliegen (weniger als 20 Personen mit ständiger Datenverarbeitung befasst).

## 3. Welche Daten wir verarbeiten

**(1) Bestandsdaten**

- E-Mail-Adresse
- Passwort (ausschließlich als kryptographischer Hash gespeichert)
- Registrierungsdatum
- Statusinformationen zum Account (z. B. Aktiv, Inaktiv)

**(2) Inhaltsdaten**
Dies umfasst alle Daten, die Sie in der App „Work Planner“ speichern und über den Dienst synchronisieren, z. B.:

- Aufgaben
- Projekte
- Notizen
- Arbeitszeiteinträge
- Einstellungen

_Hinweis:_ Bei aktivierter Ende-zu-Ende-Verschlüsselung (E2EE) liegen diese Daten auf unserem Server ausschließlich verschlüsselt vor.

**(3) Meta- und Logdaten**
Technisch bedingt beim Zugriff auf den Server:

- IP-Adresse
- Zeitpunkt des Zugriffs
- App-Version / Browsertyp
- Betriebssystem
- Fehler- und Diagnoseinformationen

### 3a. Datensicherheit und Verschlüsselung

**Verschlüsselung während der Übertragung:**
Alle Datenübertragungen zwischen Ihrer App und unserem Server erfolgen über HTTPS/TLS-Verschlüsselung.

**Verschlüsselung im Ruhezustand:**

- **Optional verfügbar:** Sie können End-to-End-Verschlüsselung (E2EE) in den Sync-Einstellungen aktivieren
- **Wenn E2EE aktiviert:** Ihre Daten werden auf Ihrem Gerät verschlüsselt, bevor sie an unseren Server gesendet werden. Wir haben keinen Zugriff auf Ihre Verschlüsselungsschlüssel und können Ihre Daten nicht entschlüsseln.
- **Wenn E2EE nicht aktiviert:** Ihre Synchronisationsdaten werden unverschlüsselt in unserer Datenbank gespeichert. Wir empfehlen dringend die Aktivierung von E2EE für sensible Daten.

**Wichtiger Hinweis:** Ohne E2EE sind Ihre Daten nur durch physische und technische Zugriffskontrollen auf unserem Server geschützt, nicht jedoch durch Verschlüsselung im Ruhezustand. Bei einem Server-Kompromiss oder physischen Zugriff auf die Speichermedien könnten Ihre Daten eingesehen werden.

**Passwortsicherheit:**
Ihr Passwort wird niemals im Klartext gespeichert. Wir verwenden bcrypt-Hashing (12 Runden) zur sicheren Speicherung Ihres Passworts.

## 4. Rechtsgrundlagen der Verarbeitung

Wir verarbeiten Ihre Daten auf Basis der folgenden Rechtsgrundlagen:

**(1) Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)**
Dies betrifft insbesondere:

- Speicherung Ihres Accounts
- Synchronisation Ihrer Inhalte
- technische Bereitstellung des Dienstes
- Versand von sicherheitsrelevanten System-E-Mails (z. B. Passwort-Reset)

**(2) Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)**
Unser Interesse ist:

- Server- und Dienstsicherheit
- Erkennung und Abwehr von Missbrauch (DDoS, Brute-Force-Attacken)
- Fehleranalyse und Stabilitätsverbesserung

**(3) Rechtliche Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)**
Dies betrifft z. B. steuerliche Aufbewahrungspflichten bei kostenpflichtigen Tarifen oder behördliche Auskunftspflichten.

## 5. Hosting und Infrastruktur

Der Dienst wird bei folgendem Dienstleister gehostet:

**Alfahosting GmbH**
Ankerstraße 3b
06108 Halle (Saale)
Deutschland
Website: https://alfahosting.de/

**(1) Standort der Daten**
Die Verarbeitung erfolgt ausschließlich auf Servern in Deutschland.

**(2) Auftragsverarbeitung**
Mit der Alfahosting GmbH besteht ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO. Alfahosting verarbeitet Ihre Daten nur nach unserer Weisung und nicht zu eigenen Zwecken. Eine Übermittlung in ein Drittland findet durch den Hoster nicht statt.

## 6. Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

Wir setzen folgende Sicherheitsmaßnahmen ein:

**Zugriffssicherheit:**

- HTTPS/TLS-Verschlüsselung für alle Datenübertragungen
- JWT-basierte Authentifizierung mit Token-Versionierung
- bcrypt Passwort-Hashing (12 Runden)
- Rate-Limiting und Konto-Sperrung nach fehlgeschlagenen Login-Versuchen
- E-Mail-Verifizierung vor Kontoaktivierung

**Verschlüsselung:**

- **Übertragung:** Vollständige HTTPS/TLS-Verschlüsselung
- **Im Ruhezustand:** Optional verfügbare End-to-End-Verschlüsselung (E2EE)
  - ⚠️ **WICHTIG:** E2EE ist nicht standardmäßig aktiviert
  - ⚠️ Ohne E2EE werden Daten unverschlüsselt in der Datenbank gespeichert
  - ✅ **Empfehlung:** Aktivieren Sie E2EE für maximalen Schutz

**Datenverarbeitung bei der Synchronisation:**

**A) Standard-Synchronisation (ohne E2EE)**

- Ihre Inhaltsdaten werden über TLS/SSL transportverschlüsselt übertragen.
- Auf dem Server werden sie **unverschlüsselt** in unserer PostgreSQL-Datenbank gespeichert.
- Ein Zugriff durch den Anbieter ist technisch grundsätzlich möglich, erfolgt jedoch ausschließlich, wenn dies zur Wartung, Diagnose oder Abwehr technischer Störungen zwingend erforderlich ist.

**B) Ende-zu-Ende-Verschlüsselung (E2EE – optional)**
Wenn Sie E2EE in der App aktivieren:

- Ihre Daten werden bereits lokal auf Ihrem Gerät verschlüsselt.
- Der Server speichert ausschließlich verschlüsselte Datenblöcke („Blobs").
- Wir haben **keinen Zugriff** auf Ihre Schlüssel und können die Daten nicht wiederherstellen, entschlüsseln oder einsehen.
- Ein Verlust des Schlüssels führt zum endgültigen Datenverlust.

**Datensparsamkeit:**

- Minimale Datenerfassung (nur für Sync-Funktionalität erforderlich)
- Keine Analyse-Tools oder Tracking
- Automatische Löschung alter Synchronisationsoperationen (45 Tage)

**Verfügbarkeit und Belastbarkeit:**

- Regelmäßige Backups (Sie verwalten Ihre eigenen Backups)
- Monitoring und Fehlerprotokollierung

**Einschränkungen:**

- Keine Verschlüsselung der Datenbankdateien auf Festplattenebene
- Schutz basiert auf physischen Sicherheitsmaßnahmen des Hostinganbieters
- Bei Server-Kompromiss könnten unverschlüsselte Daten (ohne E2EE) eingesehen werden

## 7. E-Mail-Versand

Wir versenden ausschließlich transaktionale E-Mails (z. B. Passwort-Reset, Bestätigung der E-Mail-Adresse, sicherheitsrelevante Systemnachrichten). Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).

**Dienstleister:**
Der Versand der E-Mails erfolgt technisch über die Mailserver unseres Hosting-Providers **Alfahosting GmbH** (siehe Punkt 5). Es werden keine externen E-Mail-Marketing-Dienstleister eingesetzt. Die Daten verbleiben somit innerhalb der deutschen Infrastruktur.

## 8. Speicherdauer und Löschung

**(1) Account-Löschung**
Wenn Sie Ihren Account über die App-Einstellungen löschen, löschen wir Ihre Bestandsdaten und Inhaltsdaten unverzüglich, spätestens jedoch innerhalb von 7 Tagen aus allen aktiven Systemen.

**(2) Inaktivität (kostenlose Accounts)**
Wir behalten uns vor, kostenlose Konten zu löschen, die länger als 12 Monate nicht genutzt wurden. Dies erfolgt erst nach vorheriger Benachrichtigung an die hinterlegte E-Mail-Adresse.

**(3) Server-Logfiles**
Logdaten (IP-Adressen) werden nach 7 bis 14 Tagen automatisch gelöscht, sofern keine sicherheitsrelevanten Vorfälle eine längere Speicherung zur Beweissicherung erforderlich machen.

**(4) Gesetzliche Aufbewahrungspflichten**
Bei kostenpflichtigen Konten sind wir verpflichtet, rechnungsrelevante Daten (Rechnungen, Zahlungsbelege) gemäß gesetzlicher Vorgaben (§ 147 AO) bis zu 10 Jahre aufzubewahren.

## 9. Weitergabe an Dritte

Eine Weitergabe Ihrer Daten an Dritte erfolgt grundsätzlich nicht, es sei denn:

- Sie haben ausdrücklich eingewilligt (Art. 6 Abs. 1 lit. a DSGVO),
- es ist zur Vertragsabwicklung erforderlich (z. B. Weitergabe an Zahlungsdienstleister bei Premium-Accounts),
- es dient der technischen Bereitstellung (siehe Hosting),
- oder wir sind gesetzlich dazu verpflichtet (z. B. an Strafverfolgungsbehörden).

Wir verkaufen Ihre Daten **niemals** an Dritte oder Werbetreibende.

## 10. Ihre Rechte

Sie haben gemäß DSGVO jederzeit folgende Rechte:

- **Auskunft** über Ihre bei uns gespeicherten Daten (Art. 15 DSGVO)
- **Berichtigung** falscher Daten (Art. 16 DSGVO)
- **Löschung** Ihrer Daten (Art. 17 DSGVO)
- **Einschränkung** der Verarbeitung (Art. 18 DSGVO)
- **Datenübertragbarkeit** (Export Ihrer Daten) (Art. 20 DSGVO)
- **Widerspruch** gegen die Verarbeitung (Art. 21 DSGVO)
- **Widerruf** erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)

**Beschwerderecht:**
Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die für uns zuständige Behörde ist:

**Der Sächsische Datenschutzbeauftragte**
Website: https://www.saechsdsb.de/

Zur Ausübung Ihrer Rechte (z. B. Löschung) genügt eine formlose E-Mail an:
📧 contact@super-productivity.com

## 11. Kontakt

Bei Fragen zum Datenschutz erreichen Sie uns unter:
E-Mail: contact@super-productivity.com
Oder postalisch unter der in Punkt 2 genannten Anschrift.
