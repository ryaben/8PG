/*-------------------------------------
  |  Código escrito por Ramiro Yaben  |
  |  ramiroyaben@gmail.com            |
  -------------------------------------*/

$(document).ready(function($) {
    //Variables de clases para JQuery.
    var $boardImages = $('.board-image');
    var $menuScreens = $('.menu-screen');
    var $gameScreens = $('.game-screen');
    var $screenSwitchers = $('.switch');

    //Variables de elementos únicos para JQuery.
    var $boardScreen = $('#board-screen');
    var $upgradeScreen = $('#upgrade-screen');

    //Clases
    class Handler {
        constructor() {
            this.activeGame = false;
            this.powerupFunctions = {
                //Métodos plantilla para los powerups de efecto directo sobre una unidad específica.
                "addTargetedPowerup": function(handler, player, powerupName) {
                    handler.activeGame.players[player].targetedPowerups.push(powerupName);
                    if (player === 1) { $('#powerups-list').append(`<option>${powerupName}</option>`); }
                },
                "targetedStatChange": function(handler, player, tile, stat, amount) {
                    let targetedTileID = handler.getTileID(tile);
                    let targetedPlayer = handler.getPlayer(targetedTileID);
                    let targetedIndex = handler.getPropertyIndex(targetedTileID);
                    let targetedProperty = handler.getProperty(targetedTileID);

                    handler.changeGlobalPropertyStat(targetedPlayer, targetedIndex, stat, eval(amount));
                    handler.checkDeceasedProperty(targetedProperty, targetedTileID);
                    handler.loadInsights(targetedTileID);
                    if (player === 1) { $('#powerups-list option:selected').remove(); }
                },
                //---------------------------------------------------------------
                //Powerups para unidades específicas:
                "Magic missile": function(handler, player, tile) {
                    handler.powerupFunctions["targetedStatChange"](handler, player, tile, 'health', -10);
                },
                "Meal break": function(handler, player, tile) {
                    handler.powerupFunctions["targetedStatChange"](handler, player, tile, 'health', 10);
                },
                "Mule": function(handler, player, tile) {
                    handler.powerupFunctions["targetedStatChange"](handler, player, tile, 'stamina', 1);
                },
                "Deathly strike": function(handler, player, tile) {
                    handler.powerupFunctions["targetedStatChange"](handler, player, tile, 'health', '-targetedProperty.health');
                },
                //Powerups generales:
                "Call to arms": function(handler, player) { 
                    handler.activeGame.players[player].reinforcements.push(new Unit('Militia', 'food', 100, 10, 10, 1, 1, 'alive'));
                    handler.activeGame.players[player].reinforcements.push(new Unit('Militia', 'food', 100, 10, 10, 1, 1, 'alive'));
                    if (player === 1) {
                        $('#reinforcements-list').append(`<option>Militia</option>`);
                        $('#reinforcements-list').append(`<option>Militia</option>`);}
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
                    handler.activeGame.board.forEach( function(tile, index) {
                        if (tile.player === +!player) {
                            handler.checkDeceasedProperty(handler.getProperty(index), index);
                        }
                    });
                },
                "Wrath of the gods": function(handler, player) { 
                    handler.changeGlobalPropertyStat(+!player, 'Unit', 'health', -20);
                    handler.activeGame.board.forEach( function(tile, index) {
                        if (tile.player === +!player) {
                            handler.checkDeceasedProperty(handler.getProperty(index), index);
                        }
                    });
                },
                //Tecnologías de única vez:
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
                }
            }
        }

        //-----------------------------------------------------------
        //| Métodos para el funcionamiento de la pantalla del menú: |
        //-----------------------------------------------------------

        //Procesa todas las escuchas de la aplicación.
        menuEventsHandling() {
            $('.main-button').on('click', function() {
                handler.switchMenu($(this).index());
            });

            $('.back').on('click', function() {
                handler.switchMenu(-1);
            });
    
            $('#new-file').on('click', function() {
                localStorage.setItem('gameToLoad', '');
                window.location.href = "game.html";
            });
    
            $('#load-file').on('click', function() {
                window.location.href = "game.html";
            });
    
            $('#load-game-screen').on('click', 'input[name=save-entry]', function() {
                localStorage.setItem('gameToLoad', $('input[name=save-entry]:checked').val());
            });

            $('#default-parameters-check').on('change', function() {
                if ($(this).is(':checked')) {
                    $('#extra-parameters').slideUp(300);
                } else {
                    $('#extra-parameters').slideDown(300);
                }
            });

            $('.parameter-slider').on('change', function() {
                $(this).next('.parameter-value').text($(this).val() + '%');
            });

            $('#load-game-screen').on('click', '.delete-entry', function() {
                handler.deleteGame($(this));
            });

            $('.info-icon').on('click', function() {
                handler.showParameterInfo($(this).index('.info-icon'));
            });
        }

        //Cambia la sección activa del menú principal
        switchMenu(selectedScreen) {
            //Se suma 1 porque la pantalla inicial no tiene botón.
            let selectedScreenIndex = selectedScreen + 1;

            //Oculta todas las pantallas.
            $menuScreens.hide();
            //Muestra la pantalla correspondiente al botón tocado.
            $(`.menu-screen:eq(${selectedScreenIndex})`).show();

        }

        //Carga visualmente todos los archivos de guardado en el LocalStorage.
        loadSavesList() {
            for (let i = 0; i < localStorage.length; i++){
                //Si no se trata de la llave que guarda la información del jugador y que no es una partida, la carga.
                if (localStorage.key(i) != 'profile' && localStorage.key(i) != 'gameToLoad') {
                    let saveObject = JSON.parse(localStorage.getItem(localStorage.key(i)));

                    $(`
                    <label class='save-entry'>
                        <input type='radio' name='save-entry' value='${localStorage.key(i)}'>
                        <label class='save-name'>${localStorage.key(i)}</label>
                        <br>
                        &nbsp;<label for='${localStorage.key(i)}'>${saveObject.date}</label>
                        <button class='delete-entry'>Delete</button>
                    </label>
                    `).insertAfter('.main-title:eq(1)');
                }
            }
        }

        //Recupera una instancia de juego cargándola del LocalStorage y pisa al handler por defecto, o crea un juego desde una plantilla.
        setupGame(gameName) {
            //Si se pasa un nombre de partida, se carga.
            if (gameName != '') {
                let saveObject = JSON.parse(localStorage.getItem(gameName));

                this.activeGame = new Game(
                    gameName, 'active', saveObject.turn, saveObject.events, saveObject.board, saveObject.players, saveObject.date
                );
            //Si no hay nombre de partida para cargar, crea un juego nuevo según valores por defecto.
            } else {
                this.activeGame = new Game(
                    gameName, 'active', 1, '',

                    //Tablero de la partida.
                    [{propertyIndex: 0, player: 0}, {propertyIndex: 1, player: 0}, {propertyIndex: 2, player: 0}, //Fila del IA
                    {propertyIndex: false, player: false}, {propertyIndex: false, player: false}, {propertyIndex: false, player: false},
                    {propertyIndex: false, player: false}, {propertyIndex: false, player: false}, {propertyIndex: false, player: false},
                    {propertyIndex: false, player: false}, {propertyIndex: false, player: false}, {propertyIndex: false, player: false},
                    {propertyIndex: 0, player: 1}, {propertyIndex: 1, player: 1}, {propertyIndex: 2, player: 1}], //Fila del jugador
                    
                    //Valores del IA:
                    [new Player('AI', 500, 200, 400, 
                    [//Propiedades iniciales en tablero.
                        new Building('Windmill', 'Building', 'gold', 300, 80, 0, 2, 2, 'alive','food', 500),
                        new Building('Castle', 'Building', 'gold', 500, 100, 20, 2, 2, 'alive','gold', 150),
                        new Building('Temple', 'Building', 'gold', 400, 80, 0, 2, 2, 'alive','mana', 300)
                    ], 
                    [], 
                    [], 
                    {//Tecnologías.
                        "Iron tools": 0,
                        "Magical swords": 0,
                        "Campsites": 0,
                    }),

                    //Valores del jugador:
                    new Player('Ramiro', 500, 400, 400, 
                    [//Propiedades iniciales en tablero.
                        new Building('Temple', 'Building', 'gold', 400, 80, 0, 2, 2, 'alive', 'mana', 100),
                        new Building('Castle', 'Building', 'gold', 500, 100, 20, 2, 2, 'alive','gold', 125),
                        new Building('Windmill', 'Building', 'gold', 300, 80, 0, 2, 2, 'alive','food', 100)
                    ], 
                    [], 
                    [], 
                    {//Tecnologías.
                        "Iron tools": 0,
                        "Magical swords": 0,
                        "Campsites": 0,
                    })],

                    `${new Date().toLocaleDateString()} - ${new Date().getHours()}:${new Date().getMinutes()}`
                );
            }

            handler.initializeGame();
        }

        //Elimina un juego guardado en el localStorage.
        deleteGame(gameEntry) {
            let gameEntryIndex = parseInt(gameEntry.closest('.save-entry').index() - 1);
            let gameEntryName = gameEntry.siblings('.save-name').text();

            Swal.fire({
                //Aspecto visual.
                width: "80%",
                hideClass: { popup: 'animate__animated animate__bounceOut' },
                //Textos.
                title: "Are you sure?",
                text: 'This action cannot be undone.',
                //Botones.
                confirmButtonText: "Delete",
                cancelButtonText: "Cancel",
                showCancelButton: true,
            }).then((result) => {
                //Al querer salir al menú principal.
                if (result.isConfirmed) {
                    localStorage.removeItem(gameEntryName);
                    $(`.save-entry:eq(${gameEntryIndex})`).remove();
                }
            });
        }

        //Despliega un alert con la información del parámetro clickeado.
        showParameterInfo(parameter) {
            let infoMessage;

            switch (parameter) {
                case 0: infoMessage = 'Initial values of gold, mana and food for each player.'; break;
                case 1: infoMessage = 'Initial value of health for Castle, Temple and Sawmill on each player.'; break;
                case 2: infoMessage = 'If checked, players start the game with all technologies developed and their effects on.'; break;
                case 3: infoMessage = 'If checked, players start the game with 3 Warriors on the reinforcements list.'; break;
                default: ''; break;
            }

            Swal.fire({
                text: infoMessage,
                icon: 'info',
                width: '80%'
            });
        }

        //Define los detalles para el funcionamiento del menú.
        initializeMenu() {
            //Carga visualmente la lista de partidas guardadas.
            handler.loadSavesList();

            //Selecciona la primera opción de partidas guardadas.
            $('input[name=save-entry]:eq(0)').click();

            //Selecciona la pantalla inicial.
            handler.switchMenu(-1);

            //Establece parámetros en valores por defecto.
            $('#parameter-slider').attr('value', '0');

            //Carga los datos del perfil de jugador.
            handler.loadProfile();
        }

        //-----------------------------------------------------------
        //| Métodos para el funcionamiento de la pantalla de juego: |
        //-----------------------------------------------------------

        //Procesa todas las escuchas de la aplicación.
        gameEventsHandling() {
            $('#menu').on('click', function() {
                handler.showMenu();
            });
    
            $screenSwitchers.on('click', function() {
                handler.switchScreen($(this));
            });
    
            $('.board-image:not(.highlighted,.highlighted-move,.highlighted-attack)').on('click', function() {
                handler.clickBoardTile($(this));
            });
    
            $('.board-tile').on('click', '.highlighted-move', function() {
                handler.moveTile(1, $('.highlighted:eq(0)'), $(this));
            });
    
            $('.board-tile').on('click', '.highlighted-attack', function() {
                handler.attackTile(1, $('.highlighted:eq(0)'), $(this));
            });
        
            $('#crafting-data button:eq(0)').on('click', function() {
                handler.clickCraftButton(1, $(this));
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
                    handler.powerupFunctions[`${$('#powerups-list option:selected').text()}`](handler, 1, $('.board-image.highlighted:eq(0)'));
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
                handler.spawnOrDisarmUnit(1, 'spawn');
            });
    
            $('#disarm').on('click', function() {
                handler.spawnOrDisarmUnit(1, 'disarm');
            });
    
            $('#end-turn').on('click', function() {
                handler.endTurn(1, this);
            });
        }

        //Define los detalles para el funcionamiento de la partida.
        initializeGame() {
            //Activa la primera pantalla.
            $('.switch:eq(0)').click();
    
            //Carga visualmente el tablero.
            this.loadBoardImages(this.activeGame.board);
    
            //Lleva al plano visual los recursos del jugador.
            this.updateResources();
    
            //Hace clic sobre el castillo del jugador 1.
            $('.board-image:eq(13)').click();
    
            //Carga las opciones de crafting.
            this.loadCraftingList('Units');
            this.loadCraftingList('Powerups');
            this.loadCraftingList('Technologies');
    
            //Selecciona la primera opción de la lista de crafteo.
            $('#crafting-list option:eq(0)').attr('selected', true);

            //Carga visualmente la lista de eventos.
            $('#events-list').text(this.activeGame.events);
        }

        //Cambia la sección activa de la pantalla de juego.
        switchScreen(switchClicked) {
            //Efectos visuales.
            $screenSwitchers.css({
                'background-color': 'white',
                'color': 'black'});
            switchClicked.css({
                'background-color': '#4C1C24',
                'color': 'white'});

            //Activación y desactivación de divs.
            $gameScreens.hide();
            $screenSwitchers.attr('disabled', true);

            switch (switchClicked.index() - 1) {
                case 0:
                $boardScreen.show();
                $('#upgrades-switch').attr('disabled', false);
                break;
                case 1:
                $upgradeScreen.show();
                $('#board-switch').attr('disabled', false);
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
                    else if (value == 'profile' || value == 'gameToLoad' || value == 0) { return "Please choose a different name." }
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

        //Guarda la partida para poder cargarla posteriormente.
        saveGame(name) {
            localStorage.setItem(name, JSON.stringify(new Game(
                name,
                'active',
                this.activeGame.turn,
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
            this.buttonsAvailability(boardIndex, 8);
        }

        //Obtiene de un casillero: el objeto de una propiedad (si la hubiera) y de qué jugador es.
        getTileID(tile) { return parseInt(tile.attr('id').slice(11, tile.attr('id').length)); }
        getPlayer(tileID) { return this.activeGame.board[tileID].player; }
        getPropertyIndex(tileID) { return this.activeGame.board[tileID].propertyIndex; }
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
            $('.board-image:not(.highlighted,.highlighted-move,.highlighted-attack)').on('click', function() {
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
            this.activeGame.board[targetTileID].player = this.activeGame.board[currentTileID].player;
            this.activeGame.board[targetTileID].propertyIndex = this.activeGame.board[currentTileID].propertyIndex;
            this.activeGame.board[currentTileID].propertyIndex = false;
            this.activeGame.board[currentTileID].player = false;

            let targetUnit = this.activeGame.players[player].properties[this.activeGame.board[targetTileID].propertyIndex];

            //Recarga las imágenes correspondientes.
            $(`#board-tile-${targetTileID}`).attr('src', `res/img/${targetUnit.name}-${player}.png`);
            $(`#board-tile-${targetTileID}`).attr('alt', targetUnit.name);
            $(`#board-tile-${currentTileID}`).attr('src', `res/img/transparent.png`);
            $(`#board-tile-${currentTileID}`).attr('alt', 'transparent');

            //Gasta uno de stamina a la unidad.
            this.changeGlobalPropertyStat(1, this.activeGame.board[targetTileID].propertyIndex, 'stamina', -1);
            //Añade el evento.
            this.addEvent(`${this.activeGame.players[player].name}'s ${targetUnit.name} moved from square ${currentTileID} to ${targetTileID}.`);
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
            this.changeGlobalPropertyStat(+!player, this.getPropertyIndex(attackedTileID), 'health', -attackingUnit.strength);
            //Gasta uno de stamina al atacante.
            this.changeGlobalPropertyStat(player, this.getPropertyIndex(attackingTileID), 'stamina', -1);
            //Añade el evento.
            this.addEvent(`${this.activeGame.players[player].name}'s ${attackingUnit.name} attacked ${attackedUnit.name} on square ${attackedTileID}.`);

            //Si fallece el atacado, se aplican los cambios correspondientes.
            this.checkDeceasedProperty(attackedUnit, attackedTileID);
            //Retorno a la normalidad.
            this.cleanBoardOptions(attackedTileID, this);
        }

        //Procesa los cambios necesarios cuando fallece una propiedad.
        checkDeceasedProperty(property, propertyTileID) {
            if (property.health <= 0) {
                property.condition = 'deceased';
                this.activeGame.board[propertyTileID].player = false;
                this.activeGame.board[propertyTileID].propertyIndex = false;
                $(`#board-tile-${propertyTileID}`).attr('src', `res/img/transparent.png`);
                $(`#board-tile-${propertyTileID}`).attr('alt', 'transparent');
            }
        }

        //Ejecuta el cargado de imágenes del tablero visual, con una matriz de tablero lógico pasado por parámetro.
        loadBoardImages(logicalBoard) {
            let targetObject;

            logicalBoard.forEach( function(tileID, index) {
                //Verifica si el casillero tiene propiedad, para cargar la imagen debida o una transparente.
                if (tileID.player === false) {
                    targetObject = { name: 'transparent' }
                    $(`#board-tile-${index}`).attr('src', `res/img/${targetObject.name}.png`);
                } else {
                    targetObject = this.activeGame.players[tileID.player].properties[tileID.propertyIndex];
                    $(`#board-tile-${index}`).attr('src', `res/img/${targetObject.name}-${tileID.player}.png`);
                }

                $(`#board-tile-${index}`).attr('alt', targetObject.name);
            }, this);
        }
        
        //Carga las opciones de una categoría de crafteo determinada guardadas en el JSON.
        loadCraftingList(category) {
            $.getJSON("js/db.json", function(result) {
                $(`#group-${category}`).remove();
                $('#crafting-list').append(`<optgroup id='group-${category}' label='${category}'></optgroup>`);

                //Añade todas las opciones de esa categoría guardadas en el JSON.
                result[category].forEach( function(item) {
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

        //Carga los datos del perfil del localStorage.
        loadProfile() {
            let profileData = JSON.parse(localStorage.getItem("profile"));

            $('.player-name:eq(0)').html('&nbsp;' + profileData.name);
        }

        //Resalta un casillero del tablero.
        highlightTile(tile, color, highlightClass, overwrite) {
            //Elimina el efecto visual y el argumento lógico en todos los demás casilleros.
            if (overwrite == true) {
                // $boardImages.css('border', 'none');
                $boardImages.animate({borderWidth: '0px'}, 50, 'swing');
                $boardImages.removeClass(highlightClass);
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
            let countInvalid = 0;
            let maximumInvalid = 4;
            let actionValid;
            let actionColor;
            let actionClass;

            //Cuenta las opciones no válidas y resalta las válidas.
            function countInvalidOptions(handler, optionsArray) {
                optionsArray.forEach( function(validOption) {
                    if (validOption === false) {
                        countInvalid++;
                    } else {
                        handler.highlightTile($(`#board-tile-${validOption}`), actionColor, actionClass, false);
                    }
                });
            }

            //Hace distinciones según la acción del jugador.
            switch (action) {
                case 'move':
                    actionValid = false;
                    actionColor = 'blue';
                    actionClass = 'highlighted-move';
                break;
                case 'attack':
                    actionValid = 0;
                    actionColor = 'red';
                    actionClass = 'highlighted-attack';
                break;
            }

            //Array que contempla los movimientos virtualmente posibles de la unidad.
            //Opciones universales:
            let validOptions = [tileID - 3, tileID + 1, tileID + 3, tileID - 1];
            //Opciones de movimiento/ataque especiales de caballería:
            let validOptionsCavalry = [tileID - 4, tileID - 2, tileID + 2, tileID + 4];
            //Opciones de ataque especiales de arquero:
            let validAttacksBow = [tileID - 6, tileID + 2, tileID + 6, tileID - 2];

            //Borra un movimiento si la unidad está en un borde o la posibilidad objetivo está ocupada.
            if (actioningUnit != 'Priest' && actioningUnit != 'Wizard') {
                if (tile.hasClass('top-row') || this.activeGame.board[tileID - 3].player !== actionValid || this.getProperty(tileID - 3).name == 'Priest') { validOptions[0] = false }
                if (tile.hasClass('right-column') || this.activeGame.board[tileID + 1].player !== actionValid || this.getProperty(tileID + 1).name == 'Priest') { validOptions[1] = false }
                if (tile.hasClass('bottom-row') || this.activeGame.board[tileID + 3].player !== actionValid || this.getProperty(tileID + 3).name == 'Priest') { validOptions[2] = false }
                if (tile.hasClass('left-column') || this.activeGame.board[tileID - 1].player !== actionValid || this.getProperty(tileID - 1).name == 'Priest') { validOptions[3] = false }
            } 
            
            //Desctiva opciones especiales si se trata de una unidad que los posee.
            if (actioningUnit == 'Priest' || actioningUnit == 'Wizard') {
                if (tile.hasClass('top-row') || this.activeGame.board[tileID - 3].player !== actionValid) { validOptions[0] = false }
                if (tile.hasClass('right-column') || this.activeGame.board[tileID + 1].player !== actionValid) { validOptions[1] = false }
                if (tile.hasClass('bottom-row') || this.activeGame.board[tileID + 3].player !== actionValid) { validOptions[2] = false }
                if (tile.hasClass('left-column') || this.activeGame.board[tileID - 1].player !== actionValid) { validOptions[3] = false }

            } else if (actioningUnit == 'Cavalier') {
                maximumInvalid = 8;

                if (tile.hasClass('top-row') || this.activeGame.board[tileID - 2].player !== actionValid || this.getProperty(tileID - 2).name == 'Priest') { validOptionsCavalry[1] = false }
                if (tileID < 4 || this.activeGame.board[tileID - 4].player !== actionValid || this.getProperty(tileID - 4).name == 'Priest') { validOptionsCavalry[0] = false }
                if (tile.hasClass('right-column') || this.activeGame.board[tileID - 2].player !== actionValid || this.getProperty(tileID - 2).name == 'Priest') { validOptionsCavalry[1] = false }
                if (tile.hasClass('right-column') || this.activeGame.board[tileID + 4].player !== actionValid || this.getProperty(tileID + 4).name == 'Priest') { validOptionsCavalry[3] = false }
                if (tile.hasClass('bottom-row') || this.activeGame.board[tileID + 2].player !== actionValid || this.getProperty(tileID + 2).name == 'Priest') { validOptionsCavalry[2] = false }
                if (tileID > 10 || this.activeGame.board[tileID + 4].player !== actionValid || this.getProperty(tileID + 4).name == 'Priest') { validOptionsCavalry[3] = false }
                if (tile.hasClass('left-column') || this.activeGame.board[tileID - 4].player !== actionValid || this.getProperty(tileID - 4).name == 'Priest') { validOptionsCavalry[0] = false }
                if (tile.hasClass('left-column') || this.activeGame.board[tileID + 2].player !== actionValid || this.getProperty(tileID + 2).name == 'Priest') { validOptionsCavalry[2] = false }
                
                countInvalidOptions(this, validOptionsCavalry);
            } else if (actioningUnit == 'Archer' && action == 'attack') {
                maximumInvalid = 8;

                if (tileID < 6 || this.activeGame.board[tileID - 6].player !== actionValid || this.getProperty(tileID - 6).name == 'Priest') { validAttacksBow[0] = false }
                if (!tile.hasClass('left-column') || this.activeGame.board[tileID + 2].player !== actionValid || this.getProperty(tileID + 2).name == 'Priest') { validAttacksBow[1] = false }
                if (tileID > 8 || this.activeGame.board[tileID + 6].player !== actionValid || this.getProperty(tileID + 6).name == 'Priest') { validAttacksBow[2] = false }
                if (!tile.hasClass('right-column') || this.activeGame.board[tileID - 2].player !== actionValid || this.getProperty(tileID - 2).name == 'Priest') { validAttacksBow[3] = false }

                countInvalidOptions(this, validAttacksBow);
            } 

            //Por cada opción válida, resalta su casillero.
            countInvalidOptions(this, validOptions);

            //Si no existen opciones disponibles se advierte y no se efectúa nada.
            if (countInvalid >= maximumInvalid) {
                return Swal.fire({text: 'There are no options available.', icon: 'warning', width: '70%'});
            //De lo contrario elimina la escucha del evento habitual en casilleros para enfocarse solamente en el movimiento/ataque.
            } else {
                $('.board-image').off('click');
                $('#end-turn').attr('disabled', true);
                $('#powerups-cast').attr('disabled', true);
                this.disableButtons(true, true);
            }
        }

        //Actualiza visualmente los recursos del jugador almacenados en la parte lógica.
        updateResources() {
            $('#gold-score').text(this.activeGame.players[1].gold);
            $('#mana-score').text(this.activeGame.players[1].mana);
            $('#food-score').text(this.activeGame.players[1].food);
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
        buttonsAvailability(tileID, spawnReach) {
            let bonusReach = parseInt(this.activeGame.players[1].technologies["Campsites"]);
            //Primer filtro: si el casillero no tiene dueño, se habilitan los botones insight-2.
            if (this.getPlayer(tileID) === false) {
                //Si está al alcance del jugador, se puede accionar.
                let $reinforcementsAmount = $('#reinforcements-list option').length;

                if ($reinforcementsAmount == 0) {
                    this.disableButtons2(true, true);
                } else if ($reinforcementsAmount > 0 && tileID > spawnReach - bonusReach) {
                    this.disableButtons2(false, false);
                } else if ($reinforcementsAmount > 0 && tileID <= spawnReach - bonusReach) {
                    this.disableButtons2(true, false);
                }
            //Si el casillero pertenece al AI, se inhabilitan los botones de acción. 
            } else if (this.getPlayer(tileID) == 0) {
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
            if (property.stamina === 0 || this.activeGame.turn <= 1) {
                this.disableButtons(true, true);
            }

        }

        //Verifica la existencia de una propiedad viva (unidad o edificio) según su nombre en un jugador específico.
        searchProperty(name, condition, player) {
            let result = false;

            this.activeGame.players[player].properties.forEach( function(property, index) {
                if (property.name == name && property.condition == condition) {
                    result = index;
                }
            });

            return result;
        }

        endTurn(player) {
            //Localiza los edificios.
            let templeSearch = this.searchProperty('Temple', 'alive', player);
            let windmillSearch = this.searchProperty('Windmill', 'alive', player);
            let castleSearch = this.searchProperty('Castle', 'alive', player);
            //Obtiene el objeto del edificio.
            let temple = this.activeGame.players[player].properties[templeSearch];
            let windmill = this.activeGame.players[player].properties[windmillSearch];
            let castle = this.activeGame.players[player].properties[castleSearch];
            
            //Recupera la stamina de todas las propiedades.
            this.changeGlobalPropertyStat(player, 'all', 'stamina', 99);

            //Cosecha las producciones de edificios (o no).
            if (templeSearch !== false) { this.changeBalance(player, temple.productionKind, temple.productionAmount) }
            if (windmillSearch !== false) { this.changeBalance(player, windmill.productionKind, windmill.productionAmount) }
            if (castleSearch !== false) { this.changeBalance(player, castle.productionKind, castle.productionAmount) }

            //Pasa de turno, literalmente.
            if (player === 1) {this.activeGame.turn++};

            //Actualiza el casillero y la lista de crafteo.
            let currentTileID = this.getTileID($('.board-image.highlighted'));
            $('.board-image.highlighted').removeClass('highlighted');
            $(`#board-tile-${currentTileID}`).click();
            $('#crafting-list option:selected').click();
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
                //Actualiza la imagen del casillero.
                $(`#board-tile-${selectedTileID}`).attr('src', `res/img/${selectedReinforcementName}-${player}.png`);
                $(`#board-tile-${selectedTileID}`).attr('alt', selectedReinforcementName);
                //Aplica los datos de jugador y propiedad sobre el casillero del tablero.
                this.activeGame.board[selectedTileID].player = player;
                this.activeGame.board[selectedTileID].propertyIndex = this.activeGame.players[player].properties.length - 1;
                //Añade el evento.
                this.addEvent(`${this.activeGame.players[player].name} spawned ${selectedReinforcementName} on square ${selectedTileID}.`);
            } else if (action == 'disarm') {
                //Devuelve al jugador los recursos gastados en el crafting.
                this.changeBalance(1, selectedReinforcementCostKind, selectedReinforcementCostAmount);
                //Añade el evento.
                this.addEvent(`${this.activeGame.players[player].name} disarmed ${selectedReinforcementName}.`);
            }

            //Borra el refuerzo seleccionado de la lista visual de refuerzos.
            $(`#reinforcements-list option:eq(${selectedReinforcement})`).remove();
            //Borra el refuerzo seleccionado de la lista lógica de refuerzos.
            this.activeGame.players[player].reinforcements.splice(selectedReinforcement, 1);

            //Hace click sobre el casillero para actualizar el insight.
            $('.board-image.highlighted').removeClass('highlighted');
            $(`#board-tile-${selectedTileID}`).click();
        }

        //Analiza si corresponde la disponibilidad o no del botón de crafting para determinada opción seleccionada.
        buttonCraftingAvailability(resource, amount) {
            //Localiza la tecnología en el jugador (comparando el index de la opción seleccionada con el del objeto del jugador)
            let technologyBonus = this.activeGame.players[1].technologies[$('#crafting-list option:selected').text()];

            //Primer filtro: que haya recursos suficientes para craftear.
            if (this.activeGame.players[1][resource] >= amount) {
                //De antemano se habilita el botón y podrá cancelarse con el segundo filtro.
                $('#crafting-data button:eq(0)').attr('disabled', false);
                
                //Segundo filtro: especificidades.
                //No se pueden hacer crafteos con food sin un Windmill vivo o sin stamina.
                if ((resource === 'food') && (this.searchProperty('Windmill', 'alive', 1) === false || this.activeGame.players[1].properties[this.searchProperty('Windmill', 'alive', 1)].stamina < 1)) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se pueden hacer crafteos con mana sin un Temple vivo o sin stamina.
                } else if ((resource === 'mana') && (this.searchProperty('Temple', 'alive', 1) === false || this.activeGame.players[1].properties[this.searchProperty('Temple', 'alive', 1)].stamina < 1)) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se pueden hacer crafteos con gold si el Castle no tiene stamina.
                } else if (resource === 'gold' && this.activeGame.players[1].properties[this.searchProperty('Castle', 'alive', 1)].stamina < 1) {
                    $('#crafting-data button:eq(0)').attr('disabled', true);
                //No se puede hacer una misma tecnología dos o más veces.
                } else if ($('#crafting-data button:eq(0)').text() === 'Develop' && technologyBonus != 0) {
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
                    case 'Units':
                        loadUnitSummary(targetObject);
                        $('#crafting-data button:eq(0)').text('Recruit');
                        break;
                    case 'Buildings':
                        loadUnitSummary(targetObject);
                        $('#crafting-data button:eq(0)').text('Build');
                        break;
                    case 'Powerups':
                        $('#crafting-summary-unit').hide();
                        $('#crafting-data button:eq(0)').text('Cast');
                        break;
                    case 'Technologies':
                        $('#crafting-summary-unit').hide();
                        $('#crafting-data button:eq(0)').text('Develop');
                        break;
                }
                
                //Aplica los cambios visuales generales.
                $('#crafting-description-p').text(targetObject.description);
                $('#crafting-cost p:eq(1)').text(targetObject.costAmount);
                $('#crafting-cost img').attr('src', `res/img/${targetObject.costKind}.png`);
                $('#crafting-portrait').attr('src', `res/img/${targetObject.name}-1.png`);

                //Verifica si el jugador puede craftear esa opción cargada.
                this.buttonCraftingAvailability(targetObject.costKind, targetObject.costAmount);
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

                    if (unitName === 'Warrior' || unitName === 'Militia') {
                        unitStrength = parseInt($('#crafting-unit-strength').text()) + parseInt(this.activeGame.players[player].technologies["Magical swords"]);
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
                    
                    //Añade la unidad a la lista visual de refuerzos si es el jugador 1.
                    if (player === 1) {$('#reinforcements-list').append(`<option>${$('#crafting-list option:selected').text()}</option>`)};
                    //Añade el evento.
                    this.addEvent(`${this.activeGame.players[player].name} recruited ${unitName}.`);
                    //Actualiza la condición de los botones si está seleccionado un casillero vacío.
                    this.buttonsAvailability(this.getTileID($('.board-image.highlighted:eq(0)')), 8);
                    break;

                //Al invocar un powerup, lee y ejecuta su función correspondiente según el index que tenga.
                case 'Cast':
                    if ($('#crafting-list option:selected').index() <= 3) {
                        this.powerupFunctions["addTargetedPowerup"](this, player, $('#crafting-list option:selected').text());
                    } else {
                        this.powerupFunctions[$('#crafting-list option:selected').text()](this, player);
                    }

                    //Añade el evento.
                    this.addEvent(`${this.activeGame.players[player].name} casted ${$('#crafting-list option:selected').text()}.`);
                    break;

                //Si desarrolla una tecnología, obtiene el efecto del JSON y lo aplica en el jugador.
                case 'Develop':
                    $.getJSON("js/db.json", function(result) {
                        let technology = result.Technologies[$('#crafting-list option:selected').index()];

                        this.activeGame.players[player].technologies[technology.name] = technology.effect;

                        if (this.powerupFunctions[$('#crafting-list option:selected').text()] != undefined) {
                            this.powerupFunctions[$('#crafting-list option:selected').text()](this, player);
                        }
    
                        button.attr('disabled', true);
                        //Añade el evento.
                        this.addEvent(`${this.activeGame.players[player].name} developed ${$('#crafting-list option:selected').text()}.`);
                    }.bind(this));
                    break;

                case 'Build':
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

            this.changeGlobalPropertyStat(1, buildingResource, 'stamina', -1);

            //Aplica el gasto del crafteo y actualiza la disponibilidad del botón para craftear de nuevo.
            this.changeBalance(1, this.getCraftingResource(), parseInt('-' + $('#crafting-cost p:eq(1)').text()));
            this.buttonCraftingAvailability(this.getCraftingResource(), parseInt($('#crafting-cost p:eq(1)').text()));

            //Actualiza el casillero seleccionado por si el crafteo tuvo incidencias en él.
            this.loadInsights(this.getTileID($('.board-image.highlighted:eq(0)')));
        }

        //Aplica una suma o resta al balance de un recurso dado de determinado jugador y actualiza visualmente.
        changeBalance(player, resource, amount) {
            this.activeGame.players[player][resource] += amount;
            //Lo sube a 0 si queda negativo.
            if (this.activeGame.players[player][resource] < 0) { this.activeGame.players[player][resource] = 0 }
            this.updateResources();
        }

        //Recorre todas las propiedades elegidas de un jugador dado y aumenta/reduce un recurso a elección en determinada cantidad.
        //Valores válidos para el criterio: 'all' (todo), nombre de propiedad, tipo de propiedad (unidad o edificio) o index de propiedad específico.
        changeGlobalPropertyStat(player, criterion, stat, amount) {
            this.activeGame.players[player].properties.forEach( function(item, index) {
                //Si el criterio de inclusión coincide con 'todos', unidad/edificio, index o un nombre, se aplica.
                if ((criterion == 'all' || criterion == item.type || criterion == item.name || criterion === index) && (item.condition != 'deceased')) {
                    //Distingue si el stat implicado es stamina o no por motivo de funciones diferentes.
                    if (stat == 'stamina') {
                        item.stamina += Math.min(amount, item.staminaMax - item.stamina);
                        //Lo sube a 0 si queda negativo.
                        if (item.stamina < 0) { item.stamina = 0 }
                    } else {
                        item[stat] += amount;
                    }
                }
            });
        }
    }

    class Game {
        constructor(name, condition, turn, events, board, players, date) {
            this.name = name;
            this.condition = condition;
            this.turn = turn;
            this.events = events;
            this.board = board;
            this.players = players;
            this.date = date;
        }
    }

    class Player {
        constructor(name, gold, mana, food, properties, reinforcements, targetedPowerups, technologies) {
            this.name = name;
            this.gold = gold;
            this.mana = mana;
            this.food = food;
            this.properties = properties;
            this.reinforcements = reinforcements;
            this.targetedPowerups = targetedPowerups;
            this.technologies = technologies;
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
    handler = new Handler();
    handler.menuEventsHandling();
    handler.gameEventsHandling();
    handler.initializeMenu();
});