OutpostTLH
==========

Outpost, The last hope

Is a remake of the old video game [Outpost](http://en.wikipedia.org/wiki/Outpost_%28video_game%29)

Some screenshot:
![Surface](/readme/Outpost_1.jpg "Surface")
![Underground](/readme/Outpost_2.jpg "Underground")
![Deep](/readme/Outpost_3.jpg "Deep")

Running locally
---------------

The game is written as ES modules, so it has to be served over HTTP (opening `Outpost3.html` straight from disk does not work):

    python -m http.server 8765

then open http://localhost:8765/Outpost3.html. The regression and placement checks are at http://localhost:8765/test/regression.html.

Missions live in `data/missions/` (one JSON file per mission, listed in `index.json`). The mission editor is at http://localhost:8765/editor.html: in Chrome or Edge use "Apri cartella missioni" on `data/missions` to save directly; elsewhere use Esporta/Importa. Campaigns (ordered sequences of missions) live in `data/campaigns/` and are edited in the editor's "Campagne" section.
