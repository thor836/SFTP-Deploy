const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

let Client = require('ssh2-sftp-client');
let sftp = new Client();

const host = core.getInput('host');
const port = parseInt(core.getInput('port'));
const username = core.getInput('username');
const password = core.getInput('password');

core.setSecret(password);

const localPath = core.getInput('localPath');
const remotePath = core.getInput('remotePath');

sftp.connect({
    host: host,
    port: port,
    username: username,
    password: password,
    authHandler: 'password',
    debug: core.info,
    algorithms: {
        cipher: ["aes128-ctr"],
        serverHostKey: ["ssh-rsa"],
        compress: ["none"],
    }
}).then(async () => {
    core.info("Connection established.");
    core.info("Current working directory: " + await sftp.cwd())

    if (fs.lstatSync(localPath).isDirectory()) {
        return sftp.uploadDir(localPath, remotePath);
    } else {

        var directory = await sftp.realPath(path.dirname(remotePath));
        if (!(await sftp.exists(directory))) {
            await sftp.mkdir(directory, true);
            console.log("Created directories.");
        }

        var modifiedPath = remotePath;
        if (await sftp.exists(remotePath)) {
            if ((await sftp.stat(remotePath)).isDirectory) {
                var modifiedPath = modifiedPath + path.basename(localPath);
            }
        }

        return sftp.put(fs.createReadStream(localPath), modifiedPath);
    }

}).then(() => {
    core.info("Upload finished.");
    return sftp.end();
}).catch(err => {
    core.setFailed(`Action failed with error ${err}`);
    process.exit(1);
});
