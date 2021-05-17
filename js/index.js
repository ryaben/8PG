$(document).ready(function($) {
    //Variables de clases para jQuery.
    var $menuScreens = $('.menu-screen');

    class MenuHandler {
        //-----------------------------------------------------------
        //| Métodos para el funcionamiento de la pantalla del menú: |
        //-----------------------------------------------------------

        //Procesa todas las escuchas de la aplicación.
        menuEventsHandling() {
            $('.main-button').on('click', function() {
                handler.switchMenu($(this).index());
            });

            $('#player-profile-button').on('click', function() {
                try {
                    handler.loadProfile(JSON.parse(localStorage.getItem('profilesList')).active);
                } catch {
                    return;
                }
            });

            $('.back').on('click', function() {
                handler.switchMenu(-1);
            });

            $('.player-name').on('click', function() {
                if ($(this).text() == "\xa0No profile created") {
                    $('.main-button:eq(2)').click();
                }
            });

            $('#default-parameters-check').on('change', function() {
                if ($(this).is(':checked')) {
                    $('#extra-parameters').slideUp(300);
                } else {
                    $('#extra-parameters').slideDown(300);
                }
            });

            $('#ai-difficulty').on('change', function() {
                gameParameters.AIDifficulty = $(this).val();
            });

            $('#victory-list').on('change', function() {
                //Muestra visualmente la descripción del modo de victoria.
                handler.showParameterInfo($(this).prop('selectedIndex'), 'victoryModes');
                //Edita el parámetro.
                gameParameters.victoryMode = $(this).val();
            });

            $('#board-size').on('change', function() {
                switch ($(this).val()) {
                    case 'Small':
                        $('#board-size-value').text('5x3');
                    break;
                    case 'Medium':
                        $('#board-size-value').text('5x5');
                    break;
                    case 'Large':
                        $('#board-size-value').text('7x5');
                    break;
                }

                gameParameters.boardSize = $(this).val();
            });

            $('#technologies-developed').on('change', function() {
                gameParameters.technologiesDeveloped = $(this).is(':checked');
            });

            $('#initial-units').on('change', function() {
                if ($(this).is(':checked') == false) {
                    gameParameters.initialArmy = [];
                } else if ($(this).is(':checked') == true) {
                    handler.setCustomParameter('initialArmy');
                }
            });

            $('#initial-units-amount').on('change', function() {
                if ($('#initial-units').is(':checked')) {
                    handler.setCustomParameter('initialArmy');
                }
            });

            $('#initial-units-type').on('change', function() {
                if ($('#initial-units').is(':checked')) {
                    handler.setCustomParameter('initialArmy');
                }
            });

            $('#initial-powerups').on('change', function() {
                if ($(this).is(':checked') == false) {
                    gameParameters.initialPowerups = [];
                } else if ($(this).is(':checked') == true) {
                    handler.setCustomParameter('initialPowerups');
                }
            });

            $('#initial-powerups-amount').on('change', function() {
                if ($('#initial-powerups').is(':checked')) {
                    handler.setCustomParameter('initialPowerups');
                }
            });

            $('#initial-powerups-type').on('change', function() {
                if ($('#initial-powerups').is(':checked')) {
                    handler.setCustomParameter('initialPowerups');
                }
            });

            $('.parameter-slider').on('change', function() {
                //Actualiza visualmente el valor del slider.
                $(this).next('.parameter-value').text($(this).val() + '%');
                //Edita el valor del parámetro (redondea los valores a múltiplo de 10).
                if ($(this).attr('id') == 'resources-slider') {
                    gameParameters.initialGold = Math.round((400 + 400 * ($(this).val() / 100)) / 10) * 10;
                    gameParameters.initialMana = Math.round((300 + 300 * ($(this).val() / 100)) / 10) * 10;
                    gameParameters.initialFood = Math.round((300 + 300 * ($(this).val() / 100)) / 10) * 10;
                } else if ($(this).attr('id') == 'health-slider') {
                    gameParameters.initialCastleHealth = Math.round((100 + 100 * ($(this).val() / 100)) / 10) * 10;
                    gameParameters.initialTempleHealth = Math.round((80 + 80 * ($(this).val() / 100)) / 10) * 10;
                    gameParameters.initialWindmillHealth = Math.round((80 + 80 * ($(this).val() / 100)) / 10) * 10;
                }
            });

            $('#new-file').on('click', function() {
                if (JSON.parse(localStorage.getItem('profilesList')) == null) {
                    return Swal.fire({text: 'First, you must create a profile!', icon: 'warning', width: '70%'});
                } else {
                    localStorage.setItem('gameToLoad', '');
                    localStorage.setItem('gameParameters', JSON.stringify(gameParameters));
                    window.location.href = "game.html";
                }
            });
    
            $('#load-file').on('click', function() {
                window.location.href = "game.html";
            });
    
            $('#load-game-screen').on('click', 'input[name=save-entry]', function() {
                localStorage.setItem('gameToLoad', $('input[name=save-entry]:checked').val());
            });

            $('#load-game-screen').on('click', '.delete-entry', function() {
                handler.deleteGame($(this));
            });

            $('.info-icon').on('click', function() {
                handler.showParameterInfo($(this).index('.info-icon'), 'parameterDescriptions');
            });

            $('#add-profile').on('click', function() {
                handler.addProfile();
            });

            $('#change-name').on('click', function() {
                handler.changeProfile();
            });

            $('#delete-profile').on('click', function() {
                handler.deleteProfile();
            });

            $('#profile-list').on('change', function() {
                handler.loadProfile($('#profile-list').prop('selectedIndex'));
            });

            $('#save-profile').on('click', function() {
                handler.chooseProfile($('#profile-list').prop('selectedIndex'));
                $('.back:eq(2)').click();
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
                if (localStorage.key(i) != 'profilesList' && localStorage.key(i) != 'gameToLoad' && localStorage.key(i) != 'gameParameters') {
                    let saveObject = JSON.parse(localStorage.getItem(localStorage.key(i)));

                    $(`
                    <label class='save-entry'>
                        <input id='save-entry-${i}' name='save-entry' type='radio' value='${localStorage.key(i)}'>
                        <label class='save-name' for='save-entry-${i}'>${localStorage.key(i)}</label>
                        <br>
                        &nbsp;<label for='${localStorage.key(i)}'>${saveObject.date}</label>
                        <button class='delete-entry'>Delete</button>
                    </label>
                    `).insertAfter('.main-title:eq(1)');
                }
            }
            
            //Si no hay partidas guardadas, lo notifica y anula el botón de cargado.
            this.unableGameLoading();
        }

        //Carga los datos del perfil del localStorage según la opción elegida en el select.
        loadProfile(index) {
            let profilesList = JSON.parse(localStorage.getItem('profilesList'));
            let profileData = profilesList.profiles[index];

            if (profileData != null) {
                $('#games-played').html('Games played:&nbsp;' + profileData.gamesPlayed);
                $('#games-won').html(`Games won:&nbsp;${profileData.gamesWon}&nbsp;(${Math.round((profileData.gamesWon * 100) / profileData.gamesPlayed)}%)`);
                $('#profile-list').prop('selectedIndex', index);
            }
        }

        //Cambia el valor de active por el perfil elegido.
        chooseProfile(index) {
            let profilesList = JSON.parse(localStorage.getItem("profilesList"));

            profilesList.active = index;
            //Carga el nombre en New game.
            $('.player-name:eq(0)').css('color', 'green');
            $('.player-name:eq(0)').html('&nbsp;' + profilesList.profiles[index].name);
            
            localStorage.setItem('profilesList', JSON.stringify(profilesList));
        }

        //Cambia el nombre del perfil seleccionado y lo guarda en localStorage.
        changeProfile() {
            if ($('#profile-list').val() == null) {
                return Swal.fire({text: 'There are no players to edit.', icon: 'warning', width: '70%'});
            } else if ($('#profile-name-input').val() == "") {
                return Swal.fire({text: 'Please write a new name for the current player.', icon: 'warning', width: '70%'});
            } else {
                let profilesList = JSON.parse(localStorage.getItem("profilesList"));
                let selectedProfile = $('#profile-list').prop('selectedIndex');

                //Cambia el nombre del perfil en el localStorage.
                profilesList.profiles[selectedProfile].name = $('#profile-name-input').val();
                localStorage.setItem('profilesList', JSON.stringify(profilesList));

                //Actualiza la lista de perfiles y el nombre del perfil actual.
                this.updateProfiles();
                $('#profile-list').val($('#profile-name-input').val());

                //Notifica las acciones;
                $('#profile-name-input').val('');
                return Swal.fire({text: 'Name successfully changed.', icon: 'info', width: '70%'});
            }
        }

        //Agrega un perfil nuevo, y si no existe el objeto de perfiles lo crea.
        addProfile() {
            let newProfile = {
                name: $('#profile-name-input').val(),
                gamesPlayed: 0,
                gamesWon: 0
            }

            if ($('#profile-name-input').val() == "") {
                return Swal.fire({text: 'Please write a name for the new player.', icon: 'warning', width: '70%'});
            } try {
                let profilesList = JSON.parse(localStorage.getItem("profilesList"));
                profilesList.profiles.push(newProfile);
                localStorage.setItem('profilesList', JSON.stringify(profilesList));
            } catch {
                localStorage.setItem('profilesList', JSON.stringify({
                    profiles: [newProfile],
                    active: 0
                }));
            } finally {
                $('#profile-name-input').val("");
                this.updateProfiles();

                $('#profile-list').prop('selectedIndex', $('#profile-list option').length - 1);
                this.loadProfile($('#profile-list').prop('selectedIndex'));
                this.chooseProfile($('#profile-list').prop('selectedIndex'));

                Swal.fire({text: 'Player successfully added.', icon: 'info', width: '70%'});
            }
        }

        deleteProfile() {
            if ($('#profile-list').val() == null) {
                return Swal.fire({text: 'There are no players to delete.', icon: 'warning', width: '70%'});
            } else {
                Swal.fire({
                    //Aspecto visual.
                    width: "80%",
                    icon: 'warning',
                    //Textos.
                    text: 'Do you want to delete this profile? This action cannot be undone.',
                    //Botones.
                    confirmButtonText: "Delete",
                    cancelButtonText: "Cancel",
                    showCancelButton: true,
                }).then((result) => {
                    if (result.isConfirmed) {
                        let profilesList = JSON.parse(localStorage.getItem("profilesList"));
    
                        //Borra del localStorage el perfil actual según su index.
                        profilesList.profiles.splice($('#profile-list').prop('selectedIndex'), 1);
                        localStorage.setItem('profilesList', JSON.stringify(profilesList));
                        //Actualiza los perfiles y selecciona el primero.
                        this.updateProfiles();
                        $('#profile-list').prop('selectedIndex', 0);
                        this.loadProfile(0);
                    }
                });
            }
        }

        //Agrega cada jugador a la lista visual.
        updateProfiles() {
            let profilesList = JSON.parse(localStorage.getItem("profilesList"));

            if (profilesList != null) {
                $("#profile-list").html('');

                profilesList.profiles.forEach(function(current) {
                    $("#profile-list").append(`<option>${current.name}</option>`);
                });
            }
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
                //Si era el último save, aplica los efectos correspondientes.
                this.unableGameLoading();
            });
        }

        //Impide el cargado de saves si no hay ninguno, y lo notifica visualmente.
        unableGameLoading() {
            if ($('.save-entry').length <= 0) {
                $(`<p style='color:white;margin-left:auto;margin-right:auto;'>There are no games saved.</p>`).insertAfter('.main-title:eq(1)');
                $('#load-file').prop('disabled', true);
            }
        }

        //Carga los nombres de las unidades en el apartado correspondiente de New game.
        loadInitialTypes(type) {
            $.getJSON("js/db.json", function(result) {
                result[type].forEach(function(current) {
                    $(`#initial-${type}-type`).append(`<option>${current.name}</option>`)
                });
            }.bind(this));
        }

        //Despliega un alert con la información del parámetro clickeado.
        showParameterInfo(index, type) {
            $.getJSON("js/db.json", function(result) {
                let infoMessage = result[type][index];

                if (type === 'parameterDescriptions') {
                    Swal.fire({
                        text: infoMessage,
                        icon: 'info',
                        width: '80%'
                    });
                } else if (type === 'victoryModes') {
                    $('#victory-description').text(infoMessage);
                }
            }.bind(this));
        }

        //Edita el valor de un determinado parámetro de partida personalizada en el objeto Parameter.
        setCustomParameter(parameter) {
            if (parameter == 'initialArmy') {
                //Borra el ejército inicial para no duplicar en caso de seleccionar varias veces.
                gameParameters.initialArmy.length = 0;

                $.getJSON("js/db.json", function(result) {
                    //Busca en la db por el nombre de la unidad deseada.
                    let foundUnit = result.units.find(function(unit) {
                        return unit.name === $('#initial-units-type').val()
                    });

                    //Hace bucle hasta la cantidad de unidades que desea el usuario y las agrega a los refuerzos iniciales.
                    for (let i = 0; i < $('#initial-units-amount').val(); i++) {
                        gameParameters.initialArmy.push(new Unit(
                            foundUnit.name,
                            'Unit',
                            foundUnit.costKind,
                            foundUnit.costAmount,
                            foundUnit.health,
                            foundUnit.strength,
                            foundUnit.staminaMax,
                            foundUnit.staminaMax,
                            'alive'
                        ));
                    }
                });
            } else if (parameter == 'initialPowerups') {
                //Hace bucle hasta la cantidad de powerups que desea el usuario y los agrega a la lista inicial.
                for (let i = 0; i < $('#initial-powerups-amount').val(); i++) {
                    gameParameters.initialPowerups.push($('#initial-powerups-type').val());
                }
            }
        }

        //Define los detalles para el funcionamiento del menú.
        initializeMenu() {
            //Carga visualmente la lista de partidas guardadas.
            this.loadSavesList();

            //Selecciona la primera opción de partidas guardadas.
            $('input[name=save-entry]:eq(0)').click();

            //Selecciona la pantalla inicial.
            this.switchMenu(-1);

            //Establece parámetros en valores por defecto.
            $('#board-size').val('Medium');
            $('#board-size-value').text('5x5');
            $('.parameter-slider').attr('value', '0');
            this.loadInitialTypes('units');
            this.loadInitialTypes('powerups');
            this.showParameterInfo(0, 'victoryModes');

            //Carga los perfiles.
            this.updateProfiles();

            //Selecciona el perfil activo.
            try {
                this.loadProfile(JSON.parse(localStorage.getItem('profilesList')).active);
                this.chooseProfile(JSON.parse(localStorage.getItem('profilesList')).active);
            } catch {
                return;
            }
        }
    }

    class Parameter {
        constructor (victoryMode, boardSize, technologiesDeveloped, initialCastleHealth, initialTempleHealth, initialWindmillHealth, initialGold, initialMana, initialFood, initialArmy, initialPowerups, AIDifficulty, playerBonus) {
            this.victoryMode = victoryMode;
            this.boardSize = boardSize;
            this.technologiesDeveloped = technologiesDeveloped;
            this.initialCastleHealth = initialCastleHealth;
            this.initialTempleHealth = initialTempleHealth;
            this.initialWindmillHealth = initialWindmillHealth;
            this.initialGold = initialGold;
            this.initialMana = initialMana;
            this.initialFood = initialFood;
            this.initialArmy = initialArmy;
            this.initialPowerups = initialPowerups;
            this.AIDifficulty = AIDifficulty;
            this.playerBonus = playerBonus;
        }
    }

    //Crea el handler encargado de maquetar el menú.
    handler = new MenuHandler();
    gameParameters = new Parameter('Conquest', 'Medium', false, 100, 80, 80, 400, 300, 300, [], [], 'Easy', 'No bonus');
    handler.menuEventsHandling();
    handler.initializeMenu();
});