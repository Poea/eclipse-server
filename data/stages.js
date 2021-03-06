'use strict';

const Actor = require('../models/actor');
const Asteroid = require('../models/asteroid');
const configs = require('../configs');

const GEOMETRY = require('../enums/geometry');
const BUFFS = require('../enums/buffs');
const DEFAULT_STAGE_ID = configs.get('stage.default');
const ANGLE_DELTA = 0.003;

module.exports = [{
    id: DEFAULT_STAGE_ID,
    name: 'Hale',
    onCreate: function(stage){
        stage.addActor(new Actor({
            x: 0,
            y: 0,
            kind: 'planet',
            geometry: GEOMETRY.CIRCLE,
            size: 118,
            onCollide: function(actor, stage){
                if (actor.kind === 'player' && actor.type === 'player-base'){
                    stage.removeAggro(actor);
                    actor.setBuff(BUFFS.SANCTUARY, 200);

                    if(Math.random() > 0.95){
                        actor.armor += 2;
                        if (actor.armor > actor.maxArmor){
                            actor.armor = actor.maxArmor;
                        }
                    }
                }
            }
        }));

        for(var i = 0; i < 32; i ++){
            var seed = Math.random() * Math.PI * 2 - Math.PI,
                radius = Math.random() * 800 + 450;

            var asteroid = new Asteroid({
                x: Math.cos(seed) * radius,
                y: Math.sin(seed) * radius,
                angle: seed,
                angleDelta: Math.random() * ANGLE_DELTA,
                radius: radius,
                rotateAround: { x: 0, y: 0 } //not usable yet
            });

            stage.addActor(asteroid);
        }
    }
}];
