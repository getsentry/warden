export const id = 222;
export const ids = [222];
export const modules = {

/***/ 61222:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {



var config = __webpack_require__(99659);
var node_child_process = __webpack_require__(31421);
var node_util = __webpack_require__(57975);
var client = __webpack_require__(77186);

const getValidatedProcessCredentials = (profileName, data, profiles) => {
    if (data.Version !== 1) {
        throw Error(`Profile ${profileName} credential_process did not return Version 1.`);
    }
    if (data.AccessKeyId === undefined || data.SecretAccessKey === undefined) {
        throw Error(`Profile ${profileName} credential_process returned invalid credentials.`);
    }
    if (data.Expiration) {
        const currentTime = new Date();
        const expireTime = new Date(data.Expiration);
        if (expireTime < currentTime) {
            throw Error(`Profile ${profileName} credential_process returned expired credentials.`);
        }
    }
    let accountId = data.AccountId;
    if (!accountId && profiles?.[profileName]?.aws_account_id) {
        accountId = profiles[profileName].aws_account_id;
    }
    const credentials = {
        accessKeyId: data.AccessKeyId,
        secretAccessKey: data.SecretAccessKey,
        ...(data.SessionToken && { sessionToken: data.SessionToken }),
        ...(data.Expiration && { expiration: new Date(data.Expiration) }),
        ...(data.CredentialScope && { credentialScope: data.CredentialScope }),
        ...(accountId && { accountId }),
    };
    client.setCredentialFeature(credentials, "CREDENTIALS_PROCESS", "w");
    return credentials;
};

const resolveProcessCredentials = async (profileName, profiles, logger) => {
    const profile = profiles[profileName];
    if (profiles[profileName]) {
        const credentialProcess = profile["credential_process"];
        if (credentialProcess !== undefined) {
            const execPromise = node_util.promisify(config.externalDataInterceptor?.getTokenRecord?.().exec ?? node_child_process.exec);
            try {
                const { stdout } = await execPromise(credentialProcess);
                let data;
                try {
                    data = JSON.parse(stdout.trim());
                }
                catch {
                    throw Error(`Profile ${profileName} credential_process returned invalid JSON.`);
                }
                return getValidatedProcessCredentials(profileName, data, profiles);
            }
            catch (error) {
                throw new config.CredentialsProviderError(error.message, { logger });
            }
        }
        else {
            throw new config.CredentialsProviderError(`Profile ${profileName} did not contain credential_process.`, { logger });
        }
    }
    else {
        throw new config.CredentialsProviderError(`Profile ${profileName} could not be found in shared credentials file.`, {
            logger,
        });
    }
};

const fromProcess = (init = {}) => async ({ callerClientConfig } = {}) => {
    init.logger?.debug("@aws-sdk/credential-provider-process - fromProcess");
    const profiles = await config.parseKnownFiles(init);
    return resolveProcessCredentials(config.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile,
    }), profiles, init.logger);
};

exports.fromProcess = fromProcess;


/***/ })

};
