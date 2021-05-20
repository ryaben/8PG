/*-------------------------------------
  |  Código escrito por Ramiro Yaben  |
  |  ramiroyaben@gmail.com            |
  -------------------------------------*/

/* Próximas adiciones:
- Terrenos en el tablero y tipos de mapa
- Ajustes de audio, zoom de tablero, etc.
- Contrincante IA
*/

$(document).ready(function($) {
    //Clases
    class GameHandler {
        constructor() {
            this.activeGame = false;
            this.powerupFunctions = {
                //Métodos plantilla para los powerups de efecto directo sobre una unidad específica.
                "addTargetedPowerup": function(handler, player, powerupName) {
                    handler.activeGame.players[player].powerups.push(powerupName);
                    handler.updateVisualList(player, 'powerups');
                },
                "targetedStatChange": function(handler, tile, stat, amount, player) {
                    let targetedTileID = handler.getTileID(tile);
                    let targetedPlayer = handler.getPlayer(targetedTileID);
                    let targetedIndex = handler.getPropertyIndex(targetedTileID);
                    let targetedProperty = handler.getProperty(targetedTileID);

                    handler.changeGlobalPropertyStat(targetedPlayer, targetedIndex, stat, amount);
                    handler.checkDeceasedProperty(targetedProperty, targetedTileID, targetedPlayer);
                    handler.loadInsights(targetedTileID);
                    handler.activeGame.players[player].powerups.splice($('#powerups-list option:selected').index(), 1);
                    handler.updateVisualList(player, 'powerups');
                },
                //---------------------------------------------------------------
                //Powerups con target específico:
                "Magic missile": function(handler, tile, player) {
                    handler.powerupFunctions["targetedStatChange"](handler, tile, 'health', -10, player);
                },
                "Meal break": function(handler, tile, player) {
                    handler.powerupFunctions["targetedStatChange"](handler, tile, 'health', 10, player);
                },
                "Mule": function(handler, tile, player) {
                    handler.powerupFunctions["targetedStatChange"](handler, tile, 'stamina', 1, player);
                },
                "Deathly strike": function(handler, tile, player) {
                    handler.powerupFunctions["targetedStatChange"](handler, tile, 'health', -handler.getProperty(handler.getTileID(tile)).health, player);
                },
                //Powerups generales:
                "Call to arms": function(handler, player) { 
                    handler.activeGame.players[player].reinforcements.push(new Unit('Militia', 'food', 100, 10, 10, 1, 1, 'alive'));
                    handler.activeGame.players[player].reinforcements.push(new Unit('Militia', 'food', 100, 10, 10, 1, 1, 'alive'));
                    $('#reinforcements-list').append(`<option>Militia</option>`);
                    $('#reinforcements-list').append(`<option>Militia</option>`);
                },
                "Summon gold": function(handler, player) { 
                    handler.changeBalance(player, 'gold', 175);
                },
                "Harvest food": function(handler, player) { 
                    handler.changeBalance(player, 'food', 175);
                },
                "Tribute for mana": function(handler, player) { 
                    handler.changeBalance(player, 'mana', 175);
                },
                "Ceasefire offer": function(handler, player) {
                    handler.activeGame.players[player].specialAttributes.ceasefireMultiplier = 0;
                },
                "Spiritual healing": function(handler, player) { 
                    handler.changeGlobalPropertyStat(player, 'Warrior', 'health', 10); 
                },
                "Revitalize": function(handler, player) { 
                    handler.changeGlobalPropertyStat(player, 'all', 'stamina', 1);
                },
                "Victory festival": function(handler, player) { 
                    handler.changeGlobalPropertyStat(player, 'Unit', 'health', 20);
                },
                "Distant onslaught": function(handler, player) {
                    handler.changeGlobalPropertyStat(+!player, 'Building', 'health', -20);
                    handler.activeGame.board.tiles.forEach(function(tile, index) {
                        if (tile.player === +!player) {
                            handler.checkDeceasedProperty(handler.getProperty(index), index, +!player);
                        }
                    });
                },
                "Wrath of the gods": function(handler, player) { 
                    handler.changeGlobalPropertyStat(+!player, 'Unit', 'health', -20);
                    handler.activeGame.board.tiles.forEach(function(tile, index) {
                        if (tile.player === +!player) {
                            handler.checkDeceasedProperty(handler.getProperty(index), index, +!player);
                        }
                    });
                },
                //Tecnologías de única vez:
                "Giant wheels": function(handler, player) {
                    let castle = handler.searchProperty('Castle', 'alive', player);
                    handler.activeGame.players[player].properties[castle].type = 'Unit';
                },
                "Gold fever": function(handler, player) {
                    let temple = handler.searchProperty('Temple', 'alive', player);
                    let windmill = handler.searchProperty('Windmill', 'alive', player);
                    handler.activeGame.players[player].properties[temple].productionKind = 'gold';
                    handler.activeGame.players[player].properties[windmill].productionKind = 'gold';
                },
                "Iron tools": function(handler, player) {
                    handler.changeGlobalPropertyStat(player, 'Castle', 'productionAmount', 50);
                },
                "Magical swords": function(handler, player) {
                    handler.changeGlobalPropertyStat(player, 'Warrior', 'strength', 10);
                    handler.changeGlobalPropertyStat(player, 'Militia', 'strength', 10);
                    handler.activeGame.players[player].reinforcements.forEach((unit) => {
                        if (unit.name === 'Warrior' || unit.name === 'Militia') {
                            unit.strength += 10;
                        }
                    });
                },
                "Campsites": function(handler, player) {
                    if (player === 0) {
                        handler.activeGame.players[player].specialAttributes.spawnReach = (3 * handler.activeGame.board.columns);
                    } else if (player === 1) {
                        handler.activeGame.players[player].specialAttributes.spawnReach = ((handler.activeGame.board.rows - 3) * handler.activeGame.board.columns) - 1;
                    }
                }
            }
        }

        //-----------------------------------------------------------
        //| Métodos para el funcionamiento de la pantalla de juego: |
        //-----------------------------------------------------------

        //Procesa todas las escuchas de la aplicación.
        gameEventsHandling() {
            $('#menu').on('click', function() {
                handler.showMenu();
            });
    
            $('.switch').on('click', function() {
                handler.switchScreen($(this), $('#lower-bar').is(':visible'));
            });
    
            $('#board').on('click', '.board-image:not(.highlighted,.highlighted-move,.highlighted-attack)', function() {
                handler.clickBoardTile($(this));
            });
    
            $('#board').on('click', '.highlighted-move', function() {
                handler.moveTile(handler.activeGame.turnPlayer, $('.highlighted:eq(0)'), $(this));
            });
    
            $('#board').on('click', '.highlighted-attack', function() {
                handler.attackTile(handler.activeGame.turnPlayer, $('.highlighted:eq(0)'), $(this));
            });
        
            $('#crafting-data button:eq(0)').on('click', function() {
                handler.clickCraftButton(handler.activeGame.turnPlayer, $(this));
            });
    
            $('#crafting-list').on('click', 'option', function() {
                handler.loadCraftingInfo($(this));
            });
    
            $('#crafting-list').on('change', function() {
                handler.loadCraftingInfo($('#crafting-list option:selected'));
            });
    
            $('#powerups-cast').on('click', function() {
                if ($('#powerups-list option:selected').text() == '') {
                    Swal.fire({text: 'You have no powerups to cast.', icon: 'warning', width: '70%'});
                } else {
                    handler.powerupFunctions[`${$('#powerups-list option:selected').text()}`](handler, $('.board-image.highlighted:eq(0)'), handler.activeGame.turnPlayer);
                }
            });
    
            $('#move').on('click', function() {
                let highlightedTile = $('.board-image.highlighted:eq(0)');
                handler.highlightValidOptions(highlightedTile, 'move', highlightedTile.attr('alt'));
            });
    
            $('#attack').on('click', function() {
                let highlightedTile = $('.board-image.highlighted:eq(0)');
                handler.highlightValidOptions(highlightedTile, 'attack', highlightedTile.attr('alt'));
            });
    
            $('#spawn').on('click', function() {
                handler.spawnOrDisarmUnit(handler.activeGame.turnPlayer, 'spawn');
            });
    
            $('#disarm').on('click', function() {
                handler.spawnOrDisarmUnit(handler.activeGame.turnPlayer, 'disarm');
            });
    
            $('#end-turn').on('click', function() {
                handler.startTurn(+!(handler.activeGame.turnPlayer));
            });
        }

        //Define los detalles para el funcionamiento de la partida.
        initializeGame() {
            //Activa la primera pantalla.
            $('.switch:eq(0)').click();
    
            //Carga visualmente el tablero.
            this.loadBoardImages(this.activeGame.board.tiles);
    
            //Lleva al plano visual los recursos y listas del jugador.
            this.updateResources(this.activeGame.turnPlayer);
            this.updateVisualList(this.activeGame.turnPlayer, 'reinforcements');
            this.updateVisualList(this.activeGame.turnPlayer, 'powerups');
    
            //Hace clic sobre el primer casillero.
            $('.board-image:eq(0)').click();
    
            //Carga las opciones de crafting.
            this.loadCraftingList('units');
            this.loadCraftingList('powerups');
            this.loadCraftingList('technologies');
    
            //Selecciona la primera opción de la lista de crafteo.
            $('#crafting-list option:eq(0)').attr('selected', true);

            //Carga visualmente la lista de eventos.
            $('#events-list').text(this.activeGame.events);

            //Notifica.
            Swal.fire({text: `${this.activeGame.players[1].name} has to play now.`, icon: 'info', width: '70%', confirmButtonText: 'Start'});
        }

        //Cambia la sección activa de la pantalla de juego.
        switchScreen(switchClicked) {
            //Efectos visuales.
            $('.switch').css({
                'background-color': 'white',
                'color': 'black'});
            switchClicked.css({
                'background-color': '#4C1C24',
                'color': 'white'});

            //Activación y desactivación de divs.
            $('.game-screen').hide();
            $('.switch').attr('disabled', true);

            switch (switchClicked.index() - 1) {
                case 0:
                //Muestra el tablero y habilita el botón contrario.
                $('#board-screen').show();
                $('#upgrades-switch').attr('disabled', false);
                //Muestra las barras inferiores y quita su animación.
                $('#board-tile-0').click();
                break;
                case 1:
                //Muestra el crafting y habilita el botón contrario.
                $('#upgrade-screen').show();
                $('#board-switch').attr('disabled', false);
                //Oculta las barras inferiores y agrega su animación.
                $('#lower-bar').hide();
                $('#lowest-bar').hide();
                break;
            }
        }

        //Muestra el menú de partida activa y sus opciones
        showMenu() {
            Swal.fire({
                //Aspecto visual.
                width: "80%",
                background: "thistle",
                hideClass: { popup: 'animate__animated animate__bounceOut' },
                //Textos.
                title: "Pause",
                text: 'Game name:',
                input: "text",
                inputValue: this.activeGame.name,
                //Botones.
                confirmButtonText: "Save game",
                confirmButtonColor: "#4C1C24",
                denyButtonText: "Exit to menu",
                denyButtonColor: "#4C1C24",
                cancelButtonText: "Resume game",
                cancelButtonColor: "#4C1C24",
                showDenyButton: true,
                showCancelButton: true,
                //Verificación del valor para guardar el juego.
                inputValidator: (value) => {
                    //Si el nombre de partida es vacío, se solicita uno.
                    if (!value) { return "Please choose a name for the file." }
                    //El nombre de partida no puede tener ciertos valores que ocasionarían problemas con otras áreas.
                    else if (value == 'profilesList' || value == 'gameToLoad' || value == 'gameParameters' || value == 0) { return "Please choose a different name." }
                    //Ante cualquier otro caso, se cambia el nombre de la partida actual y se guarda el Game en localStorage.
                    else { this.activeGame.name = value; this.saveGame(value) }
                }

            }).then((result) => {
                //Al querer salir al menú principal.
                if (result.isDenied) {
                    Swal.fire({
                        title: 'Are you sure?',
                        text: 'Unsaved actions will be lost!',
                        icon: 'warning',
                        width: "80%",
                        showCancelButton: true,
                        confirmButtonText: 'Exit',
                        cancelButtonText: 'Stay'
                    }).then((result) => {
                        //Si se acepta salir, devuelve al menú inicial del juego.
                        if (result.isConfirmed) {
                            window.location.href = "index.html";
                        }
                    });
                }
            });
        }

        //Recupera una instancia de juego cargándola del LocalStorage y pisa al handler por defecto, o crea un juego desde una plantilla.
        setupGame(gameName) {
            //Busca los parámetros de partida almacenados en localStorage.
            let gameParameters = JSON.parse(localStorage.getItem('gameParameters'));
            //Trae las tecnologías disponibles en el juego.
            let technologiesList = {};
            let boardRows;
            let boardColumns;

            //Calcula el tamaño del tablero según el string que lo define.
            switch (gameParameters.boardSize) {
                case 'Minimal':
                    boardRows = 5;
                    boardColumns = 3;
                break;
                case 'Small':
                    boardRows = 5;
                    boardColumns = 5;
                break;
                case 'Large':
                    boardRows = 7;
                    boardColumns = 5;
                break;
                case 'Huge':
                    boardRows = 7;
                    boardColumns = 7;
                break;
            }

            let gameBoard = new Board(boardRows, boardColumns);

            //Si se pasa un nombre de partida, se carga.
            if (gameName != '') {
                let saveObject = JSON.parse(localStorage.getItem(gameName));

                this.activeGame = new Game(
                    gameName, saveObject.victoryMode, 'active', saveObject.turn, saveObject.turnPlayer, saveObject.events, saveObject.board, saveObject.players, saveObject.date
                );
            //Si no hay nombre de partida para cargar, crea un juego nuevo según valores por defecto.
            } else {
                //Busca el nombre del perfil activo.
                let profilesList = JSON.parse(localStorage.getItem('profilesList'));
                let activeName = profilesList.profiles[profilesList.active].name;
                let guestName; //Podría ser un valor vacío si se juega contra IA.
                //Debe replicar los arrays para evitar que ambos jugadores queden sujetos al mismo.
                let initialArmyCopy = [...gameParameters.initialArmy];
                let initialPowerupsCopy = [...gameParameters.initialPowerups];
                try {
                    guestName = profilesList.profiles[profilesList.guestActive].name;
                } catch {
                    guestName = 'AI';
                }
                
                //Obtiene las tecnologías y los edificios de la base de datos.
                // let buildingsList = {};

                $.getJSON('js/db.json', function(result) {
                    result.technologies.forEach(function(technology) {
                        technologiesList[technology.name] = gameParameters.technologiesDeveloped;
                    });

                    // result.buildings.forEach(function(building) {
                    //     buildingsList[building.name.toLowerCase()] = building;
                    // });
                });

                //Debe replicar el objeto para evitar que ambos jugadores queden sujetos al mismo.
                let technologiesListCopy = {...technologiesList};

                this.activeGame = new Game(
                    gameName, gameParameters.victoryMode, 'active', 1, 1,'',

                    //Tablero de la partida.
                    gameBoard,
                    
                    //Valores del jugador 0:
                    [new Player(guestName, profilesList.guestActive, gameParameters.initialGold, gameParameters.initialMana, gameParameters.initialFood, 
                    [//Propiedades iniciales en tablero. TODO: cargarlas del json
                        // buildingsList.castle, buildingsList.temple, buildingsList.windmill
                        new Building('Castle', 'Building', 'gold', 500, gameParameters.initialCastleHealth, 20, 2, 2, 'alive','gold', 150),
                        new Building('Temple', 'Building', 'gold', 400, gameParameters.initialTempleHealth, 0, 2, 2, 'alive','mana', 100),
                        new Building('Windmill', 'Building', 'gold', 300, gameParameters.initialWindmillHealth, 0, 2, 2, 'alive','food', 100)
                    ],
                    //Refuerzos
                    gameParameters.initialArmy,
                    //Powerups
                    gameParameters.initialPowerups, 
                    //Tecnologías.
                    technologiesList,
                    (2 * boardColumns) //Spawn reach
                    ),

                    //Valores del jugador 1:
                    new Player(activeName, profilesList.active, gameParameters.initialGold, gameParameters.initialMana, gameParameters.initialFood, 
                    [//Propiedades iniciales en tablero. TODO: cargarlas del json
                        // buildingsList.castle, buildingsList.temple, buildingsList.windmill
                        new Building('Castle', 'Building', 'gold', 500, gameParameters.initialCastleHealth, 20, 2, 2, 'alive','gold', 150),
                        new Building('Temple', 'Building', 'gold', 400, gameParameters.initialWindmillHealth, 0, 2, 2, 'alive', 'mana', 100),
                        new Building('Windmill', 'Building', 'gold', 300, gameParameters.initialTempleHealth, 0, 2, 2, 'alive','food', 100)
                    ], 
                    //Refuerzos
                    initialArmyCopy,
                    //Powerups
                    initialPowerupsCopy, 
                    //Tecnologías.
                    technologiesListCopy,
                    ((boardRows - 2) * boardColumns) - 1 //Spawn reach
                    )],

                    `${new Date().toLocaleDateString()} - ${new Date().getHours()}:${new Date().getMinutes()}`
                );

                //Si las tecnologías están desarrolladas de arranque, las activa.
                if (gameParameters.technologiesDeveloped == true) {
                    for (const technology in this.activeGame.players[1].technologies) {
                        this.powerupFunctions[technology](this, 0);
                        this.powerupFunctions[technology](this, 1);
                    }
                }
            }

            //Termina de definir el tablero.
            gameBoard.setLogicalBoard();
            gameBoard.setVisualBoard();
            if (gameName == '') {
                //Ubica los edificios.
                switch (gameParameters.boardSize) {
                    case 'Minimal':
                        gameBoard.setInitialBuildings(1, 2, 0, 13, 12, 14);
                    break;
                    case 'Small':
                        gameBoard.setInitialBuildings(2, 3, 1, 22, 21, 23);
                    break;
                    case 'Large':
                        gameBoard.setInitialBuildings(2, 3, 1, 32, 31, 33);
                    break;
                    case 'Huge':
                        gameBoard.setInitialBuildings(3, 4, 2, 45, 44, 46);
                    break;
                }
            }

            this.initializeGame();
        }

        //Guarda la partida para poder cargarla posteriormente.
        saveGame(name) {
            localStorage.setItem(name, JSON.stringify(new Game(
                name,
                this.activeGame.victoryMode,
                'active',
                this.activeGame.turn,
                this.activeGame.turnPlayer,
                $('#events-list').text(),
                this.activeGame.board,
                this.activeGame.players,
                `${new Date().toLocaleDateString()} - ${new Date().getHours()}:${new Date().getMinutes()}`
            )));
        }

        //Añade un evento escrito a la lista.
        addEvent(text) {
            let eventsList = $('#events-list');

            eventsList.text(
                eventsList.text() + `Turn ${this.activeGame.turn}: ${text}\n`
            );
        }

        //Organiza los eventos involucrados en el cliqueo de un casillero.
        clickBoardTile(tile) {
            let boardIndex = this.getTileID(tile);

            //Color original: '#4C1C24'
            this.highlightTile(tile, 'maroon', 'highlighted', true);
            this.loadInsights(boardIndex);
            this.buttonsAvailability(boardIndex, this.activeGame.turnPlayer);
        }

        //Obtiene de un casillero: el objeto de una propiedad (si la hubiera) y de qué jugador es.
        getTileID(tile) { return parseInt(tile.attr('id').slice(11, tile.attr('id').length)); }
        getPlayer(tileID) { return this.activeGame.board.tiles[tileID].player; }
        getPropertyIndex(tileID) { return this.activeGame.board.tiles[tileID].propertyIndex; }
        getProperty(tileID) {
            if (this.getPlayer(tileID) === false) {
                return false;
            } else {
                return this.activeGame.players[this.getPlayer(tileID)].properties[this.getPropertyIndex(tileID)];
            }
        }
        //Obtiene la clase de una opción de crafting seleccionada.
        getOptionClass(option) { return option.attr('class').slice(7, option.attr('class').length); }
        getCraftingResource() { return $('#crafting-cost img:eq(0)').attr('src').slice(8, $('#crafting-cost img:eq(0)').attr('src').length - 4); }

        //Despeja el tablero de clases y eventos.
        cleanBoardOptions(targetTileID, handler) {
            //Efectuado el movimiento/ataque, borra la clase para opciones válidas.
            $('.board-image').removeClass('highlighted-move');
            $('.board-image').removeClass('highlighted-attack');
            $('.board-image').removeClass('highlighted');

            //Reactiva la escucha del evento para el click clásico sobre cualquier casillero.
            $('#board').on('click', '.board-image:not(.highlighted,.highlighted-move,.highlighted-attack)', function() {
                handler.clickBoardTile($(this));
            });
            
            //Rehabilita los botones de acción.
            $('#end-turn').attr('disabled', false);
            $('#powerups-cast').attr('disabled', false);
            this.disableButtons(false, false);

            //Hace click sobre el casillero destino del movimiento.
            $(`#board-tile-${targetTileID}`).click();
        }
        
        //Mueve una unidad de un casillero a otro.
        moveTile(player, currentTile, targetTile) {
            let currentTileID = this.getTileID(currentTile);
            let targetTileID = this.getTileID(targetTile);

            //Intercambia la información de tablero del casillero de origen con el destino, y vacía el de origen.
            this.activeGame.board.tiles[targetTileID].player = this.activeGame.board.tiles[currentTileID].player;
            this.activeGame.board.tiles[targetTileID].propertyIndex = this.activeGame.board.tiles[currentTileID].propertyIndex;
            this.activeGame.board.tiles[currentTileID].propertyIndex = false;
            this.activeGame.board.tiles[currentTileID].player = false;

            let targetUnit = this.activeGame.players[player].properties[this.activeGame.board.tiles[targetTileID].propertyIndex];

            //Recarga las imágenes correspondientes.
            $(`#board-tile-${targetTileID}`).attr('src', `res/img/${targetUnit.name.toLowerCase()}-${player}.png`);
            $(`#board-tile-${targetTileID}`).attr('alt', targetUnit.name);
            $(`#board-tile-${currentTileID}`).attr('src', `res/img/transparent.png`);
            $(`#board-tile-${currentTileID}`).attr('alt', 'transparent');

            //Gasta uno de stamina a la unidad.
            this.changeGlobalPropertyStat(player, this.activeGame.board.tiles[targetTileID].propertyIndex, 'stamina', -1);
            //Añade el evento.
            this.addEvent(`${targetUnit.name} (${this.activeGame.players[player].name}) moved from square ${currentTileID} to ${targetTileID}.`);
            //Retorno a la normalidad.
            this.cleanBoardOptions(targetTileID, this);
        }

        attackTile(player, attackingTile, attackedTile) {
            //Ubica el ID de casillero y unidad/edificio del atacante.
            let attackingTileID = this.getTileID(attackingTile);
            let attackingUnit = this.activeGame.players[player].properties[this.getPropertyIndex(attackingTileID)];
            //Ubica el ID de casillero y unidad/edificio del atacado.
            let attackedTileID = this.getTileID(attackedTile);
            let attackedUnit = this.activeGame.players[+!player].properties[this.getPropertyIndex(attackedTileID)];

            //Se ejecuta una simulación de ataque.
            this.changeGlobalPropertyStat(+!player, this.getPropertyIndex(attackedTileID), 'health', -attackingUnit.strength * this.activeGame.players[+!player].specialAttributes.ceasefireMultiplier);
            //Gasta uno de stamina al atacante.
            this.changeGlobalPropertyStat(player, this.getPropertyIndex(attackingTileID), 'stamina', -1);
            //Añade el evento.
            this.addEvent(`${attackingUnit.name} (${this.activeGame.players[player].name}) attacked ${attackedUnit.name} on square ${attackedTileID}.`);

            //Si fallece el atacado, se aplican los cambios correspondientes.
            this.checkDeceasedProperty(attackedUnit, attackedTileID, +!player);
            //Retorno a la normalidad.
            this.cleanBoardOptions(attackedTileID, this);
        }

        //Procesa los cambios necesarios cuando fallece una propiedad.
        checkDeceasedProperty(property, propertyTileID, player) {
            if (property.health <= 0) {
                property.condition = 'deceased';
                this.activeGame.board.tiles[propertyTileID].player = false;
                this.activeGame.board.tiles[propertyTileID].propertyIndex = false;
                $(`#board-tile-${propertyTileID}`).attr('src', `res/img/transparent.png`);
                $(`#board-tile-${propertyTileID}`).attr('alt', 'transparent');

                //Verifica si esa propiedad muerta significa el fin de la partida.
                this.checkVictory(player)
            }
        }

        //verifica si se cumplen las condiciones para terminar el juego.
        checkVictory(player) {
            switch (this.activeGame.victoryMode) {
                case 'Conquest':
                    if (this.searchProperty('Castle', 'deceased', player) !== false) {
                        this.endGame(player);
                    }

                break;
                case 'Annihilation':
                    if (this.searchProperty('Castle', 'deceased', player) !== false && this.searchProperty('Temple', 'deceased', player) !== false && this.searchProperty('Windmill', 'deceased', player) !== false) {
                        this.endGame(player);
                    }

                break;
                case 'Prosperity':
                    if (this.activeGame.turn == 26) {
                        let totalGoldPlayer = this.activeGame.players[player].gold;
                        let totalGoldOtherPlayer = this.activeGame.players[+!player].gold;
                        let totalResourcesPlayer = totalGoldPlayer + this.activeGame.players[player].food + this.activeGame.players[player].mana;
                        let totalResourcesOtherPlayer = totalGoldOtherPlayer + this.activeGame.players[+!player].food + this.activeGame.players[+!player].mana;
                        let loserPlayer;

                        if (totalResourcesPlayer !== totalResourcesOtherPlayer) {
                            if (Math.min(totalResourcesPlayer, totalResourcesOtherPlayer) == totalResourcesPlayer) {
                                loserPlayer = player;
                            } else {
                                loserPlayer = +!player;
                            }
                        } else {
                            if (totalGoldPlayer !== totalGoldOtherPlayer) {
                                if (Math.min(totalGoldPlayer, totalGoldOtherPlayer) == totalGoldPlayer) {
                                    loserPlayer = player;
                                } else {
                                    loserPlayer = +!player;
                                }
                            } else {
                                loserPlayer = Math.round(Math.random());
                            }
                        }

                        this.endGame(loserPlayer);
                    }

                break;
                case 'Tech race':
                    let availableTechnologies = this.activeGame.players[player].technologies;
                    let totalTechnologies = Object.keys(availableTechnologies).length;
                    let developedTechnologies = [];

                    for (const technology in availableTechnologies) {
                        if (availableTechnologies[technology] === true) {
                            developedTechnologies.push(1);
                        }
                    }

                    if (developedTechnologies.length == totalTechnologies) {
                        this.endGame(+!player);
                    }
            }
        }

        //Efectúa los comandos para que la partida termine y se registre.
        endGame(loser) {
            //Deshabilita todos los botones de juego.
            $('.action-button').attr('disabled', true);

            //Actualiza las condiciones de los jugadores y la partida.
            this.activeGame.condition = 'ended';
            this.activeGame.players[loser].condition = 'lost';
            this.activeGame.players[+!loser].condition = 'won';

            //Accede a la partida en el localStorage y la da por concluida.
            let profilesList = JSON.parse(localStorage.getItem('profilesList'));
            let gameName;

            try {
                gameName = JSON.parse(localStorage.getItem(this.activeGame.name));
                gameName.condition = 'ended';
            } catch {
                gameName = '';
            } finally {
                if (gameName != '') {
                    localStorage.setItem(this.activeGame.name, JSON.stringify(gameName));
                }
            }

            //Contabiliza una derrota para el perdedor y victoria para el ganador.
            profilesList.profiles[this.activeGame.players[loser].profileIndex].gamesPlayed++;
            profilesList.profiles[this.activeGame.players[+!loser].profileIndex].gamesPlayed++;
            profilesList.profiles[this.activeGame.players[+!loser].profileIndex].gamesWon++;

            localStorage.setItem('profilesList', JSON.stringify(profilesList));

            //Alerta al usuario la situación.
            Swal.fire({
                title: 'Game ended!',
                text: `After ${this.activeGame.turn} turns, ${this.activeGame.players[+!loser].name} defeated ${this.activeGame.players[loser].name} and now rules the 8-bit medieval world!`,
                confirmButtonText: 'Return to menu',
                showCloseButton: false
            }).then((result) => {
                if (result.isConfirmed || result.isDismissed) {
                    window.location.href = "index.html";
                }
            });
        }

        //Ejecuta el cargado de imágenes del tablero visual, con una matriz de tablero lógico pasado por parámetro o un objeto para tile específico.
        loadBoardImages(logicalBoard) {
            if (Array.isArray(logicalBoard)) {
                let targetObject;

                logicalBoard.forEach(function(tileID, index) {
                    //Verifica si el casillero tiene propiedad, para cargar la imagen debida o una transparente.
                    if (tileID.player === false) {
                        targetObject = { name: 'transparent' }
                        $(`#board-tile-${index}`).attr('src', `res/img/${targetObject.name.toLowerCase()}.png`);
                    } else {
                        targetObject = this.activeGame.players[tileID.player].properties[tileID.propertyIndex];
                        $(`#board-tile-${index}`).attr('src', `res/img/${targetObject.name.toLowerCase()}-${tileID.player}.png`);
                    }
    
                    $(`#board-tile-${index}`).attr('alt', targetObject.name);
                }, this);
            } else if (typeof logicalBoard === 'string') {
                
            }
        }
        
        //Carga las opciones de una categoría de crafteo determinada guardadas en el JSON.
        loadCraftingList(category) {
            $.getJSON("js/db.json", function(result) {
                let capCategory = category.charAt(0).toUpperCase() + category.slice(1);

                $(`#group-${category}`).remove();
                $('#crafting-list').append(`<optgroup id='group-${category}' label='${capCategory}'></optgroup>`);

                //Añade todas las opciones de esa categoría guardadas en el JSON.
                result[category].forEach(function(item) {
                    $(`#group-${category}`).append(`<option class='option-${category}'>${item.name}</option>`);
                });

                //Selecciona la primera opción para desencadenar los efectos.
                $('#crafting-list option:eq(0)').attr('selected', true);
                $('#crafting-list option:eq(0)').click();
            }.bind(this));
        }

        //Carga la información visual de la unidad/edificio de un casillero dado.
        loadInsights(tileID) {
            let tileObject = this.getProperty(tileID);

            //Se verifica que el casillero pasado por parámetro contenga una propiedad de un jugador.
            if (tileObject === false) {
                //Si el casillero está vacío, se indica y se visualiza así.
                $('#lower-bar').hide();
                $('#lowest-bar').show();
                return;
            } else {
                //Si el casillero tiene una propiedad del jugador, se carga visualmente
                $('#title').html(`<b>${tileObject.name}</b>`);
                $('#health-score').text(tileObject.health);
                $('#strength-score').text(tileObject.strength);
                $('#stamina-score').text(tileObject.stamina + '/' + tileObject.staminaMax);

                if (tileObject.type == 'Unit') {
                    $('#production-icon').attr('src', 'res/img/transparent.png');
                    $('.insight-box:eq(2) p').text('');
                    //Agregar
                    $('.insight-box:eq(2) select:eq(0)').show();
                    $('.insight-box:eq(2) button:eq(0)').show();
                } else if (tileObject.type == 'Building') {
                    $('#production-icon').attr('src', `res/img/${tileObject.productionKind}.png`);
                    $('#production-score').text(tileObject.productionAmount);
                    $('.insight-box:eq(2) p:eq(0)').html('&nbsp;Production:&nbsp;');
                    $('.insight-box:eq(2) select:eq(0)').hide();
                    $('.insight-box:eq(2) button:eq(0)').hide();
                }

                //Pinta el fondo de los datos según el jugador.
                if (this.getPlayer(tileID) == 0) {
                    $('#insight').css('background-image', "url('res/img/background-0.png')");
                } else if (this.getPlayer(tileID) == 1) {
                    $('#insight').css('background-image', "url('res/img/background-1.png')");
                }

                //Se muestran los elementos HTML.
                $('#lower-bar').show();
                $('#lowest-bar').hide();
            }
        }

        //Resalta un casillero del tablero.
        highlightTile(tile, color, highlightClass, overwrite) {
            //Elimina el efecto visual y el argumento lógico en todos los demás casilleros.
            if (overwrite == true) {
                $('.board-image').animate({borderWidth: '0px'}, 50, 'swing');
                $('.board-image').removeClass(highlightClass);
            }

            //Aplica el efecto visual para el casillero indicado.
            tile.css('border', `0px solid ${color}`);
            tile.animate({borderWidth: '4px'}, 50, 'swing');
            //Aplica el argumento lógico (clase) para el casillero indicado.
            tile.addClass(highlightClass);
        }  

        //Resalta los casilleros válidos para movimiento para determinado casillero.
        highlightValidOptions(tile, action, actioningUnit) {
            let tileID = this.getTileID(tile);
            let columns = this.activeGame.board.columns;
            let actionValid;
            let actionColor;
            let actionClass;
            let validOptions = {
                trebuchetTop: tileID - (columns * 2), 
                cavalierTopLeft: tileID - (columns + 1), 
                normalTop: tileID - columns, 
                cavalierTopRight: tileID - (columns - 1), 
                trebuchetLeft: tileID - 2, 
                normalLeft: tileID - 1, 
                normalRight: tileID + 1, 
                trebuchetRight: tileID + 2, 
                cavalierBottomLeft: tileID + (columns - 1), 
                normalBottom: tileID + columns, 
                cavalierBottomRight: tileID + (columns + 1), 
                trebuchetBottom: tileID + (columns * 2)
            };

            //Hace distinciones según la acción del jugador.
            switch (action) {
                case 'move':
                    actionValid = false;
                    actionColor = 'blue';
                    actionClass = 'highlighted-move';
                break;
                case 'attack':
                    actionValid = +!this.activeGame.turnPlayer;
                    actionColor = 'red';
                    actionClass = 'highlighted-attack';
                break;
            }

            //Descarta movimientos posibles según el tipo de unidad.
            if (actioningUnit !== 'Trebuchet' || (actioningUnit == 'Trebuchet' && action == 'move')) {
                delete validOptions.trebuchetTop;
                delete validOptions.trebuchetLeft;
                delete validOptions.trebuchetBottom;
                delete validOptions.trebuchetRight;
            } else if (actioningUnit == 'Trebuchet') {
                if (tile.hasClass('nexttotop-row')) { delete validOptions.trebuchetTop; }
                if (tile.hasClass('nexttoleft-column')) { delete validOptions.trebuchetLeft; }
                if (tile.hasClass('nexttobottom-row')) { delete validOptions.trebuchetBottom; }
                if (tile.hasClass('nexttoright-column')) { delete validOptions.trebuchetRight; }
            }
            if (actioningUnit !== 'Archer' && actioningUnit !== 'Cavalier') {
                delete validOptions.cavalierTopLeft;
                delete validOptions.cavalierTopRight;
                delete validOptions.cavalierBottomLeft;
                delete validOptions.cavalierBottomRight;
            } else if (actioningUnit == 'Archer' && action == 'move') {
                delete validOptions.cavalierTopLeft;
                delete validOptions.cavalierTopRight;
                delete validOptions.cavalierBottomLeft;
                delete validOptions.cavalierBottomRight;
            }

            //Descarta movimientos posibles por ubicación de la unidad en extremos.
            if (tile.hasClass('top-row')) {
                delete validOptions.trebuchetTop;
                delete validOptions.cavalierTopLeft;
                delete validOptions.normalTop;
                delete validOptions.cavalierTopRight;
            }
            if (tile.hasClass('left-column')) {
                delete validOptions.trebuchetLeft;
                delete validOptions.cavalierTopLeft;
                delete validOptions.normalLeft;
                delete validOptions.cavalierBottomLeft;
            }
            if (tile.hasClass('bottom-row')) {
                delete validOptions.trebuchetBottom;
                delete validOptions.cavalierBottomLeft;
                delete validOptions.normalBottom;
                delete validOptions.cavalierBottomRight;
            }
            if (tile.hasClass('right-column')) {
                delete validOptions.trebuchetRight;
                delete validOptions.cavalierTopRight;
                delete validOptions.normalRight;
                delete validOptions.cavalierBottomRight;
            }

            //Con los movimientos restantes, quita los que estén ocupados para movimiento o no sean rivales para ataque (o el enemigo sea Priest).
            for (const option in validOptions) {
                if (this.activeGame.board.tiles[validOptions[option]].player !== actionValid) {
                   delete validOptions[option];
                }

                let attackedUnit;
                try {
                    attackedUnit = this.getProperty(validOptions[option]).name;
                } catch {
                    attackedUnit = 'Empty';
                } finally {
                    if (attackedUnit == 'Priest' && (actioningUnit !== 'Wizard' && actioningUnit !== 'Priest')) {
                        delete validOptions[option]; 
                    }
                }

                //Los válidos que quedan son resaltados.
                this.highlightTile($(`#board-tile-${validOptions[option]}`), actionColor, actionClass, false);
            }

            //Si no quedaron movimientos válidos luego del análisis, se advierte. Si hay por lo menos uno, se aplican características de juego.
            if (Object.keys(validOptions).length == 0) {
                return Swal.fire({text: 'There are no options available.', icon: 'warning', width: '70%'});
            } else {
                $('#board').off('click', '.board-image:not(.highlighted,.highlighted-move,.highlighted-attack)');
                $('#end-turn').attr('disabled', true);
                $('#powerups-cast').attr('disabled', true);
                this.disableButtons(true, true);
            }
        }

        //Actualiza visualmente los powerups de un jugador.
        updateVisualList(player, type) {
            $(`#${type}-list option`).remove();

            this.activeGame.players[player][type].forEach(function(current) {
                if (type == 'reinforcements') {
                    $(`#${type}-list`).append(`<option>${current.name}</option>`);
                } else if (type == 'powerups') {
                    $(`#${type}-list`).append(`<option>${current}</option>`);
                }
            });
        }

        //Actualiza visualmente los recursos del jugador almacenados en la parte lógica.
        updateResources(player) {
            $('#gold-score').text(this.activeGame.players[player].gold);
            $('#mana-score').text(this.activeGame.players[player].mana);
            $('#food-score').text(this.activeGame.players[player].food);
        }

        //Habilita o deshabilita los botones de acción según parámetro.
        disableButtons(move, attack) {
            $('#move').attr('disabled', move);
            $('#attack').attr('disabled', attack);
        }
        disableButtons2(spawn, disarm) {
            $('#spawn').attr('disabled', spawn);
            $('#disarm').attr('disabled', disarm);
        }

        //Analiza si corresponde la disponibilidad o no de los botones de acción para un casillero dado.
        buttonsAvailability(tileID, player) {
            //Primer filtro: si el casillero no tiene dueño, se habilitan los botones insight-2.
            if (this.getPlayer(tileID) === false) {
                //Si está al alcance del jugador, se puede accionar.
                let reinforcementsAmount = this.activeGame.players[player].reinforcements.length;

                if (reinforcementsAmount == 0) {
                    this.disableButtons2(true, true);
                } else {
                    if (player === 0) {
                        if (tileID < this.activeGame.players[player].specialAttributes.spawnReach) {
                            this.disableButtons2(false, false);
                        } else {
                            this.disableButtons2(true, false);
                        }
                    } else if (player === 1) {
                        if (tileID > this.activeGame.players[player].specialAttributes.spawnReach) {
                            this.disableButtons2(false, false);
                        } else {
                            this.disableButtons2(true, false);
                        }
                    }
                }
            //Si el casillero pertenece al otro jugador, se inhabilitan los botones de acción. 
            } else if (this.getPlayer(tileID) === (+!player)) {
                this.disableButtons(true, true);
                return;
            }
            //Segundo filtro: analiza si se contiene una unidad o un edificio.
            //Tercer filtro: analiza unidades/edificios especiales.
            let property = this.getProperty(tileID);
            switch (property.type) {
                case 'Building':
                    //Solo el Castle puede atacar.
                    if (property.name === 'Castle') {
                        this.disableButtons(true, false);
                    } else {
                        this.disableButtons(true, true);
                    }
                break;
                case 'Unit':
                    //Solo el Wall no se mueve ni ataca.
                    if (property.name === 'Wall') {
                        this.disableButtons(true, true);
                    } else {
                        this.disableButtons(false, false);
                    }
                break;
            }

            //Cuarto filtro: analiza la stamina de la propiedad y el mareo inicial del jugador.
            if (property.stamina === 0 || property.dizziness === true) {
                this.disableButtons(true, true);
            }

        }

        //Verifica la existencia de una propiedad viva o no (unidad o edificio) según su nombre en un jugador específico.
        searchProperty(name, condition, player) {
            let result = false;

            this.activeGame.players[player].properties.forEach(function(property, index) {
                if (property.name == name && property.condition == condition) {
                    result = index;
                }
            });

            return result;

            // this.activeGame.players[player].properties.find(function(property, index) {
            //     return property.name == name && property.condition == condition;
            // });
        }

        startTurn(player) {
            //Localiza los edificios.
            let templeSearch = this.searchProperty('Temple', 'alive', player);
            let windmillSearch = this.searchProperty('Windmill', 'alive', player);
            let castleSearch = this.searchProperty('Castle', 'alive', player);
            //Obtiene el objeto del edificio.
            let temple = this.activeGame.players[player].properties[templeSearch];
            let windmill = this.activeGame.players[player].properties[windmillSearch];
            let castle = this.activeGame.players[player].properties[castleSearch];

            //Cede el control al otro jugador.
            this.activeGame.turnPlayer = player;
            this.updateResources(player);
            this.updateVisualList(player, 'reinforcements');
            this.updateVisualList(player, 'powerups');
            $('#board-screen').css('background-image', `url('res/img/background-${player}.png')`);

            //Pasa de turno, literalmente.
            if (player === 1) {this.activeGame.turn++};
            $('#end-turn').text(`End turn (${this.activeGame.turn})`);
            
            if (this.activeGame.turn > 1) {
                //Recupera la stamina de todas las propiedades.
                this.changeGlobalPropertyStat(player, 'all', 'stamina', 999);

                //Cosecha las producciones de edificios (o no).
                if (templeSearch !== false) { this.changeBalance(player, temple.productionKind, temple.productionAmount) }
                if (windmillSearch !== false) { this.changeBalance(player, windmill.productionKind, windmill.productionAmount) }
                if (castleSearch !== false) { this.changeBalance(player, castle.productionKind, castle.productionAmount) }

                //Elimina el mareo de invocación.
                this.activeGame.players[player].properties.forEach(function(property) {
                    property.dizziness = false;
                });
            }

            //Actualiza el casillero y la lista de crafteo.
            let currentTileID = this.getTileID($('.board-image.highlighted'));
            $('.board-image.highlighted').removeClass('highlighted');
            $(`#board-tile-${currentTileID}`).click();
            $('#crafting-list option:selected').click();

            //Elimina el ceasefire.
            this.activeGame.players[player].specialAttributes.ceasefireMultiplier = 1;

            //Verificaciones específicas de turno. NO poner antes de la actualización de casillero y crafteo.
            if (this.activeGame.turn == 26 && this.activeGame.victoryMode == 'Prosperity') {
                return this.checkVictory(player);
            }

            //Notifica.
            Swal.fire({text: `${this.activeGame.players[player].name} has to play now.`, icon: 'info', width: '70%', confirmButtonText: 'Start'});
        }

        //Convoca una unidad en el tablero desde los refuerzos.
        spawnOrDisarmUnit(player, action) {
            let selectedReinforcement = $('#reinforcements-list option:selected').index();
            let selectedTileID = this.getTileID($('.board-image.highlighted:eq(0)'));
            let selectedReinforcementName = this.activeGame.players[player].reinforcements[selectedReinforcement].name;
            let selectedReinforcementCostKind = this.activeGame.players[player].reinforcements[selectedReinforcement].costKind;
            let selectedReinforcementCostAmount = this.activeGame.players[player].reinforcements[selectedReinforcement].costAmount;

            if (action == 'spawn') {
                //Agrega el refuerzo seleccionado al array de propiedades en el tablero.
                this.activeGame.players[player].properties.push(this.activeGame.players[player].reinforcements[selectedReinforcement]);
                //Aplica los datos de jugador y propiedad sobre el casillero del tablero.
                this.activeGame.board.tiles[selectedTileID].player = player;
                this.activeGame.board.tiles[selectedTileID].propertyIndex = this.activeGame.players[player].properties.length - 1;
                //Actualiza la imagen del casillero.
                $(`#board-tile-${selectedTileID}`).attr('src', `res/img/${selectedReinforcementName.toLowerCase()}-${player}.png`);
                $(`#board-tile-${selectedTileID}`).attr('alt', selectedReinforcementName);
                //Añade el evento.
                this.addEvent(`${this.activeGame.players[player].name} spawned ${selectedReinforcementName} on square ${selectedTileID}.`);
            } else if (action == 'disarm') {
                //Devuelve al jugador los recursos gastados en el crafting.
                this.changeBalance(player, selectedReinforcementCostKind, selectedReinforcementCostAmount);
                //Añade el evento.
                this.addEvent(`${this.activeGame.players[player].name} disarmed ${selectedReinforcementName}.`);
            }

            //Borra el refuerzo seleccionado de la lista lógica de refuerzos.
            this.activeGame.players[player].reinforcements.splice(selectedReinforcement, 1);
            //Lo actualiza visualmente.
            this.updateVisualList(player, 'reinforcements');

            //Hace click sobre el casillero para actualizar el insight.
            $('.board-image.highlighted').removeClass('highlighted');
            $(`#board-tile-${selectedTileID}`).click();
        }

        //Analiza si corresponde la disponibilidad o no del botón de crafting para determinada opción seleccionada.
        buttonCraftingAvailability(resource, amount, player) {
            //Localiza la tecnología en el jugador (comparando el index de la opción seleccionada con el del objeto del jugador)
            let technologyBonus = this.activeGame.players[player].technologies[$('#crafting-list option:selected').text()];

            //Primer filtro: que haya recursos suficientes para craftear.
            if (this.activeGame.players[player][resource] >= amount) {
                //De antemano se habilita el botón y podrá cancelarse con el segundo filtro.
                $('#crafting-data button:eq(0)').attr('disabled', false);
                
                //Segundo filtro: especificidades.
                //No se pueden hacer crafteos con food sin un Windmill vivo o sin stamina.
                if ((resource === 'food') && (this.searchProperty('Windmill', 'alive', player) === false || this.activeGame.players[player].properties[this.searchProperty('Windmill', 'alive', player)].stamina < 1)) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se pueden hacer crafteos con mana sin un Temple vivo o sin stamina.
                } else if ((resource === 'mana') && (this.searchProperty('Temple', 'alive', player) === false || this.activeGame.players[player].properties[this.searchProperty('Temple', 'alive', player)].stamina < 1)) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se pueden hacer crafteos con gold si el Castle no tiene stamina.
                } else if ((resource === 'gold') && (this.searchProperty('Castle', 'alive', player) === false || this.activeGame.players[player].properties[this.searchProperty('Castle', 'alive', player)].stamina < 1)) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se puede hacer una misma tecnología dos o más veces.
                } else if ($('#crafting-data button:eq(0)').text() === 'Develop' && technologyBonus != false) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                }
            //Si no hay recursos suficientes, no se puede hacer.
            } else {
                $('#crafting-data button:eq(0)').attr('disabled', true);
            }
        }

        //Carga los datos de unidad/edificio/powerup/tecnología en la pantalla de crafting, a través de la base en JSON.
        loadCraftingInfo(option) {
            //Función para cargar los datos básicos de una unidad o edificio del JSON pasado por parámetro.
            function loadUnitSummary(unit) {
                $('#crafting-unit-health').text(unit.health);
                $('#crafting-unit-strength').text(unit.strength);
                $('#crafting-unit-stamina').text(unit.staminaMax);
                $('#crafting-summary-unit').show();
            }

            $.getJSON("js/db.json", function(result) {
                //Obtiene del option cliqueado su índice y su categoría.
                let optionIndex = option.index();
                let optionClass = this.getOptionClass(option);

                //Con esos datos lo busca en el JSON.
                let targetObject = result[optionClass][optionIndex];
                
                //Aplica los cambios visuales correspondientes según la categoría de option.
                switch (optionClass) {
                    case 'units':
                        loadUnitSummary(targetObject);
                        $('#crafting-data button:eq(0)').text('Recruit');
                    break;
                    case 'powerups':
                        $('#crafting-summary-unit').hide();
                        $('#crafting-data button:eq(0)').text('Cast');
                    break;
                    case 'technologies':
                        $('#crafting-summary-unit').hide();
                        $('#crafting-data button:eq(0)').text('Develop');
                    break;
                }
                
                //Aplica los cambios visuales generales.
                $('#crafting-description-p').text(targetObject.description);
                $('#crafting-cost p:eq(1)').text(targetObject.costAmount);
                $('#crafting-cost img').attr('src', `res/img/${targetObject.costKind}.png`);
                $('#crafting-portrait').attr('src', `res/img/${targetObject.name.toLowerCase()}-${this.activeGame.turnPlayer}.png`);

                //Verifica si el jugador puede craftear esa opción cargada.
                this.buttonCraftingAvailability(targetObject.costKind, targetObject.costAmount, this.activeGame.turnPlayer);
            }.bind(this));
        }

        //Craftea la opción seleccionada y aplica sus efectos según su categoría.
        //Agregar un nuevo case si se inventara una nueva categoría.
        clickCraftButton(player, button) {
            switch(button.text()) {
                //En caso de reclutar una nueva unidad, crea el refuerzo y lo coloca en el array lógico y el área visual.
                case 'Recruit':
                    let unitName = $('#crafting-list option:selected').text();
                    let unitStrength;

                    if ((unitName === 'Warrior' || unitName === 'Militia') && (this.activeGame.players[player].technologies["Magical swords"] == true)) {
                        unitStrength = parseInt($('#crafting-unit-strength').text()) + 10;
                    } else {
                        unitStrength = parseInt($('#crafting-unit-strength').text());
                    }

                    this.activeGame.players[player].reinforcements.push(new Unit(
                        unitName,
                        'Unit',
                        this.getCraftingResource(),
                        parseInt($('#crafting-cost p:eq(1)').text()),
                        parseInt($('#crafting-unit-health').text()),
                        unitStrength,
                        parseInt($('#crafting-unit-stamina').text()),
                        parseInt($('#crafting-unit-stamina').text()),
                        'alive'
                    ));
                    
                    //Actualiza la lista visual de refuerzos.
                    this.updateVisualList(player, 'reinforcements');
                    //Añade el evento.
                    this.addEvent(`${this.activeGame.players[player].name} recruited ${unitName}.`);
                    //Actualiza la condición de los botones si está seleccionado un casillero vacío.
                    this.buttonsAvailability(this.getTileID($('.board-image.highlighted:eq(0)')), player);
                break;

                //Al invocar un powerup, lee y ejecuta su función correspondiente según el index que tenga.
                case 'Cast':
                    $.getJSON("js/db.json", function(result) {;
                        if (result.powerups[$('#crafting-list option:selected').index()].type == 'targeted') {
                            this.powerupFunctions["addTargetedPowerup"](this, player, $('#crafting-list option:selected').text());
                        } else {
                            this.powerupFunctions[$('#crafting-list option:selected').text()](this, player);
                        }
    
                        //Añade el evento.
                        this.addEvent(`${this.activeGame.players[player].name} casted ${$('#crafting-list option:selected').text()}.`);
                    }.bind(this));
                break;

                //Si desarrolla una tecnología, la efectúa y lo aplica en el jugador.
                case 'Develop':
                    this.activeGame.players[player].technologies[$('#crafting-list option:selected').text()] = true;
                    this.powerupFunctions[$('#crafting-list option:selected').text()](this, player);
                    button.attr('disabled', true);

                    //Añade el evento.
                    this.addEvent(`${this.activeGame.players[player].name} developed ${$('#crafting-list option:selected').text()}.`);
                
                    //Verifica si esa tecnología desarrollada significa el fin de la partida.
                    this.checkVictory(player);
                break;
            }

            //Gasta 1 de stamina al edificio que se encargó del crafteo.
            let buildingResource;

            switch (this.getCraftingResource()) { 
                case 'gold': buildingResource = 'Castle';
                break;
                case 'mana': buildingResource = 'Temple';
                break;
                case 'food': buildingResource = 'Windmill';
                break;
            }

            this.changeGlobalPropertyStat(player, buildingResource, 'stamina', -1);

            //Aplica el gasto del crafteo y actualiza la disponibilidad del botón para craftear de nuevo.
            this.changeBalance(player, this.getCraftingResource(), parseInt('-' + $('#crafting-cost p:eq(1)').text()));
            this.buttonCraftingAvailability(this.getCraftingResource(), parseInt($('#crafting-cost p:eq(1)').text()), player);

            //Actualiza el casillero seleccionado por si el crafteo tuvo incidencias en él.
            this.loadInsights(this.getTileID($('.board-image.highlighted:eq(0)')));
        }

        //Aplica una suma o resta al balance de un recurso dado de determinado jugador y actualiza visualmente.
        changeBalance(player, resource, amount) {
            this.activeGame.players[player][resource] += amount;
            //Lo sube a 0 si queda negativo.
            if (this.activeGame.players[player][resource] < 0) { this.activeGame.players[player][resource] = 0 }
            this.updateResources(player);
        }

        //Recorre todas las propiedades elegidas de un jugador dado y aumenta/reduce un recurso a elección en determinada cantidad.
        //Valores válidos para el criterio: 'all' (todo), nombre de propiedad, tipo de propiedad (unidad o edificio) o index de propiedad específico.
        changeGlobalPropertyStat(player, criterion, stat, amount) {
            this.activeGame.players[player].properties.forEach(function(item, index) {
                //Si el criterio de inclusión coincide con 'todos', unidad/edificio, index o un nombre, se aplica.
                if ((criterion == 'all' || criterion == item.type || criterion == item.name || criterion === index) && (item.condition != 'deceased')) {
                    //Distingue si el stat implicado es stamina o no por motivo de ser un recurso con tope.
                    if (stat == 'stamina') {
                        item.stamina += Math.min(amount, item.staminaMax - item.stamina);
                        //Lo sube a 0 si queda negativo, que no debería pasar.
                        if (item.stamina < 0) { item.stamina = 0 }
                    } else {
                        item[stat] += amount;
                    }
                }
            });
        }
    }

    class Board {
        constructor(rows, columns) {
            //Guarda los datos necesarios en el futuro como propiedades.
            this.rows = rows;
            this.columns = columns;
            this.tiles = [];
        }

        //Agrega los casilleros en el campo lógico.
        setLogicalBoard() {
            let totalTiles = this.rows * this.columns;

            for (let i = 0; i < totalTiles; i++) {
                this.tiles.push({propertyIndex: false, player: false});
            }
        }

        //Dibuja el tablero visual en el HTML.
        setVisualBoard() {
            let totalTiles = this.rows * this.columns;

            for (let i = 0; i < totalTiles; i++) {
                //Agrega los casilleros en el campo visual.
                $('#board').append(`
                    <div class='board-tile'>
                        <img id='board-tile-${i}' class='board-image grass' draggable="false" src='res/img/transparent.png' alt='transparent'>
                    </div>
                `);
            }

            //Establece las columnas visuales del tablero/grilla.
            $('#board').css('grid-template-columns', `repeat(${this.columns}, 1fr)`);

            //Determina los casilleros de cada fila y columna para agregarles su respectiva clase.
            for (let i = 0; i < this.columns; i++) {
                $(`#board-tile-${i}`).addClass('top-row');
                $(`#board-tile-${i + this.columns}`).addClass('nexttotop-row');
            }
            for (let i = (totalTiles - this.columns); i < totalTiles; i++) {
                $(`#board-tile-${i}`).addClass('bottom-row');
                $(`#board-tile-${i - this.columns}`).addClass('nexttobottom-row');
            }
            for (let i = Math.floor(this.rows / 2) * this.columns; i < Math.floor(this.rows / 2) * this.columns + this.columns; i++) {
                $(`#board-tile-${i}`).addClass('middle-row');
            }
            for (let i = 0; i < this.rows; i++) {
                $(`#board-tile-${i * this.columns}`).addClass('left-column');
                $(`#board-tile-${i * this.columns + 1}`).addClass('nexttoleft-column');
                $(`#board-tile-${((i + 1) * this.columns) - 1}`).addClass('right-column');
                $(`#board-tile-${((i + 1) * this.columns) - 2}`).addClass('nexttoright-column');
            }

            //Carga la imagen de fondo para cada casillero.
            $('.board-image.grass').closest('.board-tile').css('background-image', "url('res/img/grass.png')");
            $('.board-image.water').closest('.board-tile').css('background-image', "url('res/img/water.png')");
        }

        //Fija los datos lógicos para los edificios en un tablero nuevo.
        setInitialBuildings(castlePos0, templePos0, windmillPos0, castlePos1, templePos1, windmillPos1) {
            //Aplica las propiedades del jugador IA.
            this.tiles[castlePos0].propertyIndex = 0
            this.tiles[castlePos0].player = 0
            this.tiles[templePos0].propertyIndex = 1
            this.tiles[templePos0].player = 0
            this.tiles[windmillPos0].propertyIndex = 2
            this.tiles[windmillPos0].player = 0
            //Aplica las propiedades del jugador humano.
            this.tiles[castlePos1].propertyIndex = 0
            this.tiles[castlePos1].player = 1
            this.tiles[templePos1].propertyIndex = 1
            this.tiles[templePos1].player = 1
            this.tiles[windmillPos1].propertyIndex = 2
            this.tiles[windmillPos1].player = 1
        }
    }

    class Game {
        constructor(name, victoryMode, condition, turn, turnPlayer, events, board, players, date) {
            this.name = name;
            this.victoryMode = victoryMode;
            this.condition = condition;
            this.turn = turn;
            this.turnPlayer = turnPlayer;
            this.events = events;
            this.board = board;
            this.players = players;
            this.date = date;
        }
    }

    class Player {
        constructor(name, profileIndex, gold, mana, food, properties, reinforcements, powerups, technologies, spawnReach) {
            this.name = name;
            this.profileIndex = profileIndex;
            this.gold = gold;
            this.mana = mana;
            this.food = food;
            this.properties = properties;
            this.reinforcements = reinforcements;
            this.powerups = powerups;
            this.technologies = technologies;
            this.specialAttributes = {
                spawnReach: spawnReach,
                ceasefireMultiplier: 1
            }
            this.condition = 'playing';
        }
    }

    class Unit {
        constructor(name, type, costKind, costAmount, health, strength, stamina, staminaMax, condition) {
            this.name = name;
            this.type = type;
            this.costKind = costKind;
            this.costAmount = costAmount;
            this.health = health;
            this.strength = strength;
            this.stamina = stamina;
            this.staminaMax = staminaMax;
            this.condition = condition;
            this.dizziness = true;
        }
    }

    class Building extends Unit {
        constructor(name, type, costKind, costAmount, health, strength, stamina, staminaMax, condition, productionKind, productionAmount) {
            super(name, type, costKind, costAmount, health, strength, stamina, staminaMax, condition);
            this.productionKind = productionKind;
            this.productionAmount = productionAmount;
        }
    }

    //Crea el handler encargado de maquetar todas las herramientas de la jugabilidad.
    handler = new GameHandler();
    handler.gameEventsHandling();
    handler.setupGame(localStorage.getItem("gameToLoad"));
});