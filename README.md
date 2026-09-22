# Spider-Man: Záchranca mesta

**Hraj tu: https://radobuk.github.io/mesto-zachranca/**
(odporúčaný Chrome; zatiaľ len klávesnica + myš, nie dotykové ovládanie)

Malá akčná hra v prehliadači. Si Spider-Man, hojdáš sa na pavučine po meste
a zachraňuješ ľudí skôr, než bude neskoro.

## Spustenie

**Najjednoduchšie:** v **Finderi** dvojklik na `hraj.command`.
Spustí lokálny server a otvorí hru v prehliadači. Okno Terminálu nechaj
otvorené, kým hráš; zatvorením ho vypneš.

> Pozor: dvojklik vo VS Code otvorí len zdrojový kód, nie hru.
> Súbor treba otvoriť z Findera, alebo použiť `hraj.command`.

Ďalšie možnosti:

```bash
# priamo v Chrome, bez servera
open -a "Google Chrome" /Users/radobukovan/spidermanHra/index.html

# alebo vlastný server
cd /Users/radobukovan/spidermanHra && python3 -m http.server 8000
# potom otvor http://localhost:8000
```

Odporúčaný prehliadač je Chrome. V Safari hra beží tiež, ale otvor ju cez
`hraj.command` (`http://localhost:…`) – Safari má pri priamom otváraní
súborov z disku prísnejšie pravidlá.

## Ovládanie

| Klávesa | Akcia |
|---|---|
| **Ľavé tlačidlo myši (držať)** | vystreliť a držať pavučinu – mieriš myšou na budovu |
| **A / D** (alebo šípky) | pohyb a švih do strán |
| **MEDZERNÍK** | skok, odraz od steny, pustenie pavučiny |
| **W / S** | skrátiť / predĺžiť pavučinu; na stene liezť hore a dole |
| **E** | zdvihnúť človeka, položiť ho, chytiť zlodeja |

Tipy:
- Pavučinu stačí **držať** – keď sa neuchytí, hra ju sama skúša vystreliť znova.
- Skracovaním pavučiny (**W**) v spodnej časti oblúka získaš rýchlosť a výšku.
- Ak narazíš do steny, prilepíš sa – vylez hore a odraz sa medzerníkom.

## Misie

| Misia | Čo treba spraviť | Body |
|---|---|---|
| 🔥 Horiace auto | doleť k autu, **E** = vytiahnuť človeka, odnes ho do zelenej zóny | 150 |
| 🏢 Požiar v budove | vylez na strechu, **E** = zdvihnúť človeka, odnes ho do zóny | 200 |
| 🪂 Padajúci človek | chyť ho vo vzduchu skôr, než dopadne (stačí sa ho dotknúť) | 310 |
| 🦹 Zlodej | dobehni/dolet k nemu a **E** = pavučina | 120 |

Zachráneného treba doniesť k **sanitke v zelenej zóne** – šípka ti ju ukáže.
Šípky po okrajoch obrazovky vedú k aktívnym misiám a ukazujú vzdialenosť.

## Dôvera mesta

Začínaš na 100 %. Každá nestihnutá misia je **−15**, každá záchrana **+6 až +8**.
Keď dôvera klesne na nulu, hra končí. Misií pribúda, čím dlhšie hráš.

## Štruktúra kódu

```
hraj.command      spúšťač – dvojklik v Finderi
index.html        HTML, HUD, menu
css/style.css     štýly HUD a obrazoviek
js/utils.js       pomocné funkcie (matematika, kreslenie)
js/world.js       generovanie mesta, budovy, ulica, bezpečné zóny
js/effects.js     častice – oheň, dym, iskry, plávajúce texty
js/sound.js       zvuky cez WebAudio (bez externých súborov)
js/player.js      Spider-Man: fyzika hojdania, lezenie, kreslenie
js/missions.js    štyri typy misií, obete, zlodeji, bodovanie
js/game.js        herná slučka, kamera, vstupy, HUD
```

Čo sa dá ľahko doladiť:
- `PHYS` v `js/player.js` – gravitácia, sila skoku, dĺžka a dosah pavučiny
- `Missions.update` v `js/missions.js` – ako často pribúdajú misie a koľko ich beží naraz
- časy misií (`m.max`) a body (`m.pts`) v `Missions.spawn`
- `World.W`, `GROUND_Y` a generovanie budov v `js/world.js`

Pomôcka pri vývoji: `index.html?auto` preskočí menu a rovno spustí hru.

## Pre testerov

Hru netreba inštalovať – stačí otvoriť odkaz vyššie. Spätnú väzbu (chyby,
nápady, čo je ťažké alebo nudné) píšte prosím do záložky **Issues** v tomto
repozitári.

Zatiaľ funguje len ovládanie klávesnicou a myšou, takže na počítači.
Dotykové ovládanie pre mobil zatiaľ nie je.

## Poznámka

Neoficiálny nekomerčný fanúšikovský projekt na učenie sa programovania.
Spider-Man je ochranná známka Marvel Characters, Inc. Projekt nie je
nijako spojený s Marvelom ani Sony a neslúži na zárobok.
