/**
 * Created by Keith Morris on 2/9/16.
 */
import dotenv from 'dotenv';
import getConfigFromEnv from './utils/config-from-env';
import loadEnvironmentFile from './utils/load-environment-file';

export const parse = dotenv.parse.bind(dotenv);
export const config = options => {

    let defaultsData, environmentData,
        defaultOptions = {
            encoding: 'utf8',
            silent: true,
            path: '.env',
            errorOnMissing: false,
            errorOnExtra: false,
            errorOnRegex: false,
            includeProcessEnv: false,
            assignToProcessEnv: true,
            overrideProcessEnv: false,
            includeMode: true,
            includeArgvEnv: true
        },
        processEnvOptions = getConfigFromEnv(process.env);

    options = Object.assign({}, defaultOptions, processEnvOptions, options);
    //TODO: could be better, should use any type of file - not only the .env
    if (!options.defaults) options.defaults = options.path + '.defaults';
    if (!options.schema) options.schema = options.path + '.schema';

    defaultsData = loadEnvironmentFile(options.defaults, options.encoding, options.silent);
    environmentData = loadEnvironmentFile(options.path, options.encoding, options.silent);

    if ( !this.argvEnvs) {
      this.argvEnvs = {};
      /* arguments is global and it is not a 'real' array, *
       * that's why we need the 'from' conversion below.   */
      const args = Array.from(arguments);
      const obj = getFirstObject(args);
      if (obj) {
        if (options.includeMode && obj.mode){
          Object.assign(this.argvEnvs, { mode: obj.mode });
        }
        if (options.includeArgvEnv && obj.env){
          const env = filterObject(obj.env, /^WEBPACK_/i);
          Object.assign(this.argvEnvs, env);
        }
      }
    }

    //TODO: valores se perdendo entre as múltiplas chamadas,
    //isso deveria ser cumulativo - deveria manter o último estado
    let configData = Object.assign({}, defaultsData, environmentData, this.argvEnvs); //TODO: args add
    const config = options.includeProcessEnv ? Object.assign({}, configData, process.env) : configData;
    const configOnlyKeys = Object.keys(configData);
    const configKeys = Object.keys(config);

    //TODO: mover essa validação para o método validate!
    //TODO: acho que o expand deveria ser executado ANTES do bloco abaixo.

    if (options.errorOnMissing || options.errorOnExtra || options.errorOnRegex) {
      const schema = loadEnvironmentFile(options.schema, options.encoding, options.silent);
      const schemaKeys = Object.keys(schema);

      let missingKeys = schemaKeys.filter(function (key) {
        return configKeys.indexOf(key) < 0;
      });
      let extraKeys = configOnlyKeys.filter(function (key) {
        return schemaKeys.indexOf(key) < 0;
      });
      if (options.errorOnMissing && missingKeys.length) {
        throw '\n\nxDotEnv ERROR, MISSING CONFIG VALUES: ' + missingKeys.join(', ');
        //throw new Error('MISSING CONFIG VALUES: ' + missingKeys.join(', '));
      }

      if (options.errorOnExtra && extraKeys.length) {
        throw '\n\nxDotEnv ERROR, EXTRA CONFIG VALUES: ' + extraKeys.join(', ');
        //throw new Error('EXTRA CONFIG VALUES: ' + extraKeys.join(', '));
      }

      if (options.errorOnRegex) {
        const regexMismatchKeys = schemaKeys.filter(function (key) {
          if (schema[key]) {
            return !new RegExp(schema[key]).test(typeof config[key] === 'string' ? config[key] : '');
          }
        });

        if (regexMismatchKeys.length) {
          throw '\n\nxDotEnv ERROR, REGEX MISMATCH: ' + regexMismatchKeys.join(', ');
          //throw new Error('REGEX MISMATCH: ' + regexMismatchKeys.join(', '));
        }
      }
    }
    
    // the returned configData object should include process.env that override
    if (options.includeProcessEnv && !options.overrideProcessEnv) {
      for (let i = 0; i < configKeys.length; i++) {
        if (typeof process.env[configKeys[i]] !== 'undefined')
          configData[configKeys[i]] = process.env[configKeys[i]];
      }
    }

    if (options.assignToProcessEnv) {
        if (options.overrideProcessEnv) {
            Object.assign(process.env, configData);
        } else {
            const tmp = Object.assign({}, configData, process.env);
            Object.assign(process.env, tmp);
        }
    }
    return configData;
};

var typeOf2 = function (obj) {
  return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}

var getFirstObject = function (options) {
  var first = null;
  options.forEach(item => {
    var type = typeOf2(item);
    if (type === 'object') {
      first = item;
      return;
    }
  });
  return first;
}

var filterObject = function(obj, rePattern) {
  try {
    const tmp = Object.entries(obj);
    const ent = tmp.filter(function (key) {
      return !rePattern.test(key);
    });
    return Object.fromEntries(ent) || {};

  } catch(error) {
    return {};
  }
}

export const load = config;
export default {parse, config, load};
