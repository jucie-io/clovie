import { ServiceProvider } from '@jucie.io/engine';

// Two services that require each other, listed so the first requires one that comes after it.
export class LeftService extends ServiceProvider {
  static manifest = {
    name: 'Left Service',
    namespace: 'left',
    version: '1.0.0',
    requires: { right: '*' },
  };

  actions(inject) {
    return {
      name: () => 'left',
      other: () => inject('right').name(),
    };
  }
}

export class RightService extends ServiceProvider {
  static manifest = {
    name: 'Right Service',
    namespace: 'right',
    version: '1.0.0',
    requires: { left: '*' },
  };

  actions(inject) {
    return {
      name: () => 'right',
      other: () => inject('left').name(),
    };
  }
}

export default {
  views: null,
  scripts: null,
  styles: null,
  assets: null,
  partials: null,
  outputDir: './dist',
  type: 'static',
  mode: 'production',
  port: 0,
  watch: false,
  data: {},
  services: [LeftService, RightService],
};
