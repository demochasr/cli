import type { Command } from "@oclif/core";

import axios from "axios";
import chalk from "chalk";

import type { AuthConfig } from "./utils.js";

export type Application = {
	applicationId: string;
	name: string;
	// Add other application properties as needed
};

export type Database = {
	mariadbId?: string;
	mongoId?: string;
	mysqlId?: string;
	postgresId?: string;
	redisId?: string;
	name: string;
	// Add other database properties as needed
};

export type Environment = {
	name: string;
	environmentId: string;
	description: string;
	createdAt: string;
	env: string;
	projectId: string;
	applications: Application[];
	mariadb: Database[];
	mongo: Database[];
	mysql: Database[];
	postgres: Database[];
	redis: Database[];
	compose: any[];
};

export type Server = {
	serverId: string;
	name: string;
	description?: string;
	ipAddress: string;
	port: number;
	username: string;
	serverStatus?: string;
	serverType?: string;
	appName?: string;
	sshKeyId?: string;
};

export type ComposeService = {
	composeId: string;
	name: string;
	appName: string;
	description?: string;
	env?: string | null;
	composeFile?: string;
	sourceType?: string;
	composeType?: string;
	serverId?: string | null;
	composeStatus?: string;
	environmentId?: string;
	createdAt?: string;
	repository?: string | null;
	owner?: string | null;
	branch?: string | null;
	composePath?: string;
	deployments?: Array<{
		deploymentId: string;
		title?: string | null;
		description?: string | null;
		status?: string | null;
		errorMessage?: string | null;
		logPath?: string | null;
		createdAt?: string;
	}>;
};

export type Project = {
	adminId: string;
	name: string;
	projectId?: string | undefined;
	description?: string | undefined;
	environments?: Environment[];
};

const buildQueryConfig = (auth: AuthConfig) => ({
	headers: {
		"x-api-key": auth.token,
		"Content-Type": "application/json",
	},
});

export const trpcQuery = async <T>(
	auth: AuthConfig,
	path: string,
	input?: Record<string, unknown> | null,
): Promise<T> => {
	const response = await axios.get(`${auth.url}/api/trpc/${path}`, {
		...buildQueryConfig(auth),
		params: input === undefined ? undefined : {
			input: JSON.stringify({
				json: input,
			}),
		},
	});

	return response.data.result.data.json as T;
};

export const trpcMutation = async <T>(
	auth: AuthConfig,
	path: string,
	input: Record<string, unknown> | null,
): Promise<T> => {
	const response = await axios.post(
		`${auth.url}/api/trpc/${path}`,
		{
			json: input,
		},
		buildQueryConfig(auth),
	);

	return response.data.result.data.json as T;
};

export const getProjects = async (
	auth: AuthConfig,
	command: Command,
): Promise<Project[]> => {
	try {
		const projects = await trpcQuery<Project[]>(auth, "project.all", null);

		if (!projects) {
			command.error(chalk.red("Error fetching projects"));
		}

		if (projects.length === 0) {
			command.log(chalk.yellow("No projects found."));
			return [];
		}

		return projects;
	} catch (error) {
		// @ts-expect-error  TODO: Fix this
		command.error(chalk.red(`Failed to fetch project list: ${error.message}`));
	}
};

export const getProject = async (
	projectId: string | undefined,
	auth: AuthConfig,
	command: Command,
) => {
	try {
		if (!projectId) {
			command.error(chalk.red("Project ID is required"));
		}
		const project = await trpcQuery<Project>(auth, "project.one", { projectId });

		if (!project) {
			command.error(chalk.red("Error fetching project"));
		}

		return project;
	} catch (error) {
		// @ts-expect-error  TODO: Fix this
		command.error(chalk.red(`Failed to fetch project: ${error.message}`));
	}
};

export const getServers = async (
	auth: AuthConfig,
	command: Command,
): Promise<Server[]> => {
	try {
		const servers = await trpcQuery<Server[]>(auth, "server.all", null);

		if (!servers) {
			command.error(chalk.red("Error fetching servers"));
		}

		if (servers.length === 0) {
			command.log(chalk.yellow("No servers found."));
			return [];
		}

		return servers;
	} catch (error) {
		// @ts-expect-error TODO: Fix typing
		command.error(chalk.red(`Failed to fetch server list: ${error.message}`));
	}
};

export const getServer = async (
	auth: AuthConfig,
	command: Command,
	serverId: string | undefined,
): Promise<Server> => {
	try {
		if (!serverId) {
			command.error(chalk.red("Server ID is required"));
		}

		const server = await trpcQuery<Server>(auth, "server.one", { serverId });

		if (!server) {
			command.error(chalk.red("Error fetching server"));
		}

		return server;
	} catch (error) {
		// @ts-expect-error TODO: Fix typing
		command.error(chalk.red(`Failed to fetch server: ${error.message}`));
	}
};

export const getCompose = async (
	auth: AuthConfig,
	command: Command,
	composeId: string | undefined,
): Promise<ComposeService> => {
	try {
		if (!composeId) {
			command.error(chalk.red("Compose ID is required"));
		}

		const compose = await trpcQuery<ComposeService>(auth, "compose.one", {
			composeId,
		});

		if (!compose) {
			command.error(chalk.red("Error fetching compose service"));
		}

		return compose;
	} catch (error) {
		// @ts-expect-error TODO: Fix typing
		command.error(chalk.red(`Failed to fetch compose service: ${error.message}`));
	}
};
