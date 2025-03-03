import createBareServer from '@tomphttp/bare-server-node';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import serveStatic from 'serve-static';
import cluster from 'cluster';
import * as dotenv from 'dotenv'
dotenv.config()
const httpServer = createServer();

const numCPUs = process.env.MAXCPUS;
if(cluster.isMaster){
console.log("Running");
	for(let i = 0; i < numCPUs; i++){
	cluster.fork();
	}
}else{
// Run the Bare server in the /bare/ namespace. This will prevent conflicts between the static files and the bare server.
const bareServer = createBareServer('/bare/', {
	logErrors: false,
	localAddress: undefined,
	maintainer: {
		email: 'tomphttp@sys32.dev',
		website: 'https://github.com/tomphttp/',
	},
});

const serve = serveStatic(
	fileURLToPath(new URL('./public/', import.meta.url)),
	{
		fallthrough: false,
	}
);

httpServer.on('request', (req, res) => {
	if (bareServer.shouldRoute(req)) {
		bareServer.routeRequest(req, res);
	} else {
		serve(req, res, (err) => {
			res.writeHead(err?.statusCode || 500, {
				'Content-Type': 'text/plain',
			});
			res.end(err?.stack);
		});
	}
});

httpServer.on('upgrade', (req, socket, head) => {
	if (bareServer.shouldRoute(req)) {
		bareServer.routeUpgrade(req, socket, head);
	} else {
		socket.end();
	}
});

httpServer.on('listening', () => {
	console.log('Abyss Browser running on port 8080');
});

httpServer.listen({
	port: 8080,
});
}
