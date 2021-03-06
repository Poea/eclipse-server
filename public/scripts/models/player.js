define([
    'pixi',
    'pubsub',
    'enums/events',
    'enums/keys',
    'core/hotkey',
    'models/turret',
    'blueprints/ships',
    'components/staticParticle',
    'components/flyingNumber',
    'particles/trail',
    'particles/spawn',
    'particles/explosion-small-ship',
    'particles/shield'
], function(PIXI, PubSub, EVENTS, KEYS, Hotkey, Turret, ShipBlueprints, StaticParticle, FlyingNumber, trail, spawn, explosionParticle, shieldParticle){
    var playerId = null;

    PubSub.subscribe(EVENTS.CONNECTION.OPEN, (e, data) => {
        playerId = data.message.actorId;
    });

    function onDestroy(stage){
        var args = arguments;
        this.children.filter(c => typeof c.onDestroy === 'function')
            .forEach(c => c.onDestroy.apply(c, args));
        this._effects.filter(c => typeof c.onDestroy === 'function')
            .forEach(c => c.onDestroy.apply(c, args));

        const explosion = StaticParticle({
            x: this.x,
            y: this.y,
            textures: [
                PIXI.loader.resources['/public/particles/particle.png'].texture
            ],
            particle: explosionParticle,
            stage: stage
        });

        stage.addChild(explosion);

        stage.removeChild(this._name);
    }


    function onUpdate(){
        this.x += this.vx;
        this.y += this.vy;

        if (typeof this.animateMovement === 'object' && this.animateMovement){
            this.animateMovement.ticks ++;

            if (this.animateMovement.ticks >= 5){
                this.animateMovement = null;
                // this.vx = 0;
                // this.vy = 0;
            }
        }

        if (this.systems){
            this.systems.forEach(systemsIterator);
        }

        if (this._healthbar){
            this._healthbar.rotation = - this.rotation;
        }

        if (this._name){
            this._name.y = this.y - 40;
            this._name.x = this.x - this._name.width * 0.5;
        }

        if (this.buffs.indexOf('death') !== -1){
            this.alpha = 0.25;
        } else {
            this.alpha = 1;
        }
    }

    function systemsIterator(t){
        if (typeof t.onUpdate === 'function'){
            t.onUpdate();
        }
    }

    function applyUpdate(newState, stage){
        this.animateMovement = {
            x: newState.x,
            y: newState.y,
            velX: (newState.x - this.x ) * 0.2,
            velY: (newState.y - this.y ) * 0.2,
            ticks: 0
        };

        this._velocity = newState.velocity;

        this.vx = this.animateMovement.velX;
        this.vy = this.animateMovement.velY;

        const projectedRotation = -(newState.rotation || 0) + Math.PI * 0.5;
        this.rotation = projectedRotation;

        if (this.maxShield > 0 && newState.shield < this.shield){
            this.spawnShieldDamageParticles(stage);
        }
        this.shield = newState.shield;

        if (this._healthbar && newState.armor !== this.armor){
            this._healthbar.clear();

            this._healthbar.beginFill(0x00CC00);
            this._healthbar.drawRect(- this.size, 10, this.size * 2 * newState.armor / newState.maxArmor, 4);

            if (newState.armor < newState.maxArmor){
                this._healthbar.beginFill(0xDD0000);
                this._healthbar.drawRect(this.size * 2 * newState.armor / newState.maxArmor - this.size, 10,
                    this.size * 2 - this.size * 2 * newState.armor / newState.maxArmor, 4);
            }

            this._healthbar.endFill();

            if (newState.armor < this.armor){
                stage.addChild(new FlyingNumber({
                    text: `-${this.armor - newState.armor}`,
                    x: this.x + 16,
                    y: this.y - 16,
                    color: 0xff0000
                }));
            } else if (newState.armor > this.armor){
                stage.addChild(new FlyingNumber({
                    text: `${this.armor - newState.armor}`,
                    x: this.x - 16,
                    y: this.y - 16,
                    color: 0x44ff22
                }));
            }

            this.armor = newState.armor;
        }

        if (newState.target === playerId){
            this._name.style.fill = 0xff2222;
        } else {
            this._name.style.fill = 0xffffff;
        }

        if (newState.buffs){
            this.buffs = newState.buffs;
        } else {
            this.buffs = [];
        }

        if (this.id === playerId){
            PubSub.publish(EVENTS.IDENTITY.BUFFS_CHANGED, this.buffs);
        }
    }

    function spawnShieldDamageParticles(stage){
        const player = this;
        const shieldEmitter = StaticParticle({
            x: this.x,
            y: this.y,
            textures: [
                PIXI.loader.resources['/public/particles/pixel.png'].texture
            ],
            particle: shieldParticle,
            stage: stage,
            onUpdate: function(){
                this.x = player.x;
                this.y = player.y;
                this.particle.update(20*0.001);
            }
        });

        stage.addChild(shieldEmitter);
    }

    return function Player(options, stage){
        const blueprint = ShipBlueprints.find(b => b.id === options.type || b.id === options.ship);
        const texture = PIXI.loader.resources[blueprint.texture]
            .texture;
        const player = new PIXI.Container();
        const playerSprite = new PIXI.Sprite(texture);


        player.id = options.id;
        player.kind = 'player';

        player.armor = options.armor;
        player.maxArmor = options.maxArmor;
        player.shield = options.shield;
        player.maxShield = options.maxShield;

        player.size = options.size;
        player._velocity = 0;

        player.vx = 0;
        player.vy = 0;

        playerSprite.anchor.x = 0.5;
        playerSprite.anchor.y = 0.5;

        player.rotation = 0;
        player.rotateDirection = 0;
        player.projectedRotation = Math.PI * 0.5;

        player.onUpdate = onUpdate;
        player.applyUpdate = applyUpdate;
        player.onDestroy = onDestroy;

        player.buffs = [];

        player.spawnShieldDamageParticles = spawnShieldDamageParticles;

        if (player.id === playerId){
            Hotkey.register({
                keycode: KEYS.W,
                onPress: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.ACCELERATE);
                },
                onRelease: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.DECELERATE);
                }
            });

            Hotkey.register({
                keycode: KEYS.A,
                onPress: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.RADIAL_ACCELERATE, {
                        direction: -1
                    });
                },
                onRelease: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.RADIAL_DECELERATE);
                }
            });

            Hotkey.register({
                keycode: KEYS.D,
                onPress: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.RADIAL_ACCELERATE, {
                        direction: 1
                    });
                },
                onRelease: () => {
                    PubSub.publish(EVENTS.COMMANDS.PLAYER.RADIAL_DECELERATE);
                }
            });

            Hotkey.register({
                keycode: KEYS.F1,
                onPress: () => PubSub.publish(EVENTS.UI.TOGGLE)
            });
        }

        player.addChild(playerSprite);
        player.systems = [];
        player._effects = [];

        blueprint.systems.forEach(s => {
            var system = null;

            if (s.kind === 'turret'){
                system = Turret({
                   x: s.offset.x,
                   y: s.offset.y,
                   isControllable: player.id === playerId,
                   parent: player
                });
            } else if (s.kind === 'trail'){
                const offsetX = s.offset.x;
                const offsetY = s.offset.y;

                system = StaticParticle({
                    textures: [
                        PIXI.loader.resources['/public/particles/particle.png'].texture
                    ],
                    particle: trail,
                    x: 0,
                    y: 0,
                    onUpdate: function (){
                        const angle = player.rotation;

                        this.particle.spawnPos.x = offsetX * Math.cos(angle) - offsetY * Math.sin(angle) + player.x;
                        this.particle.spawnPos.y = offsetX * Math.sin(angle) + offsetY * Math.cos(angle) + player.y;

                        this.particle.emit = !!player.animateMovement;
                        this.particle.update(20 * 0.001);
                    }
                });

                player._effects.push(system);
                return stage.addChild(system);
            }

            if (system){
                player.systems.push(system);
            }
        });

        player.systems.forEach(s => player.addChild(s));

        const healthBar = new PIXI.Graphics();
        player.addChild(healthBar);
        player._healthbar = healthBar;

        const _name = (options.name || player.id).replace('-', '').substring(0, 12);
        const name = new PIXI.Text(_name, {
            fontFamily : 'Nunito', fontSize: 14, fill : 0xffffff
        });
        stage.addChild(name);
        player._name = name;

        setTimeout(function(){
            stage.addChild(new StaticParticle({
                textures: [
                    PIXI.loader.resources['/public/particles/sparks.png'].texture
                ],
                particle: spawn,
                x: player.x,
                y: player.y,
                stage: stage
            }));
        }, 1);

        return player;
    }
});
