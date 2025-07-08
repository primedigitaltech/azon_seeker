import Emittery from 'emittery';

@Emittery.mixin('_emittery')
export class BaseWorker<EV> {
  declare on: Emittery<EV>['on'];
  declare off: Emittery<EV>['off'];
  declare emit: Emittery<EV>['emit'];
  declare once: Emittery<EV>['once'];
}
