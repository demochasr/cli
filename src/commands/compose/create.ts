import { Command, Flags } from "@oclif/core";
import chalk from "chalk";
import inquirer from "inquirer";
import * as fs from "node:fs";

import {
	getProjects,
	getServers,
	trpcMutation,
	type Environment,
	type Project,
	type Server,
} from "../../utils/shared.js";
import { readAuthConfig } from "../../utils/utils.js";

type Answers = {
	project: Project;
	environment: Environment;
	serverMode: "local" | "remote";
	serverId?: string;
	name: string;
	description: string;
	sourceType: "raw" | "github";
	composeFilePath?: string;
	envFilePath?: string;
	owner?: string;
	repository?: string;
	branch?: string;
	githubId?: string;
	composePath?: string;
};

export default class ComposeCreate extends Command {
	static description =
		"Create a Docker Compose service and optionally target a remote Dokploy server.";

	static examples = [
		"$ <%= config.bin %> compose create",
		"$ <%= config.bin %> compose create --projectId <projectId> --environmentId <environmentId> --serverId <serverId> --name turn-proxy --sourceType raw --composeFile ./docker-compose.yml --envFile ./.env.turn",
	];

	static flags = {
		projectId: Flags.string({
			char: "p",
			description: "ID of the project",
			required: false,
		}),
		environmentId: Flags.string({
			char: "e",
			description: "ID of the environment",
			required: false,
		}),
		serverId: Flags.string({
			char: "s",
			description: "Target Dokploy server ID for remote deployment",
			required: false,
		}),
		name: Flags.string({
			char: "n",
			description: "Compose service name",
			required: false,
		}),
		description: Flags.string({
			char: "d",
			description: "Compose service description",
			required: false,
		}),
		sourceType: Flags.string({
			description: "Compose source type",
			options: ["raw", "github"],
			required: false,
		}),
		composeType: Flags.string({
			description: "Compose type",
			options: ["docker-compose", "stack"],
			default: "docker-compose",
		}),
		composeFile: Flags.string({
			description: "Path to local compose file for raw mode",
			required: false,
		}),
		envFile: Flags.string({
			description: "Path to local env file to upload",
			required: false,
		}),
		owner: Flags.string({
			description: "GitHub owner for github mode",
			required: false,
		}),
		repository: Flags.string({
			description: "GitHub repository for github mode",
			required: false,
		}),
		branch: Flags.string({
			description: "Git branch for github mode",
			required: false,
		}),
		githubId: Flags.string({
			description: "Dokploy GitHub provider ID for github mode",
			required: false,
		}),
		composePath: Flags.string({
			description: "Compose path in repository for github mode",
			default: "./docker-compose.yml",
		}),
		skipConfirm: Flags.boolean({
			char: "y",
			description: "Skip confirmation prompt",
			default: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeCreate);
		let {
			projectId,
			environmentId,
			serverId,
			name,
			description,
			sourceType,
			composeType,
			composeFile,
			envFile,
			owner,
			repository,
			branch,
			githubId,
			composePath,
		} = flags;

		const projects = await getProjects(auth, this);
		let selectedProject = projects.find((item) => item.projectId === projectId);

		if (!selectedProject) {
			const answer = await inquirer.prompt<{ project: Project }>([
				{
					choices: projects.map((item) => ({
						name: item.name,
						value: item,
					})),
					message: "Select a project:",
					name: "project",
					type: "list",
				},
			]);
			selectedProject = answer.project;
			projectId = selectedProject.projectId;
		}

		if (!selectedProject?.environments?.length) {
			this.error(chalk.yellow("No environments found in this project."));
		}

		let selectedEnvironment = selectedProject.environments.find(
			(item) => item.environmentId === environmentId,
		);
		if (!selectedEnvironment) {
			const answer = await inquirer.prompt<{ environment: Environment }>([
				{
					choices: selectedProject.environments.map((item) => ({
						name: `${item.name} (${item.description})`,
						value: item,
					})),
					message: "Select an environment:",
					name: "environment",
					type: "list",
				},
			]);
			selectedEnvironment = answer.environment;
			environmentId = selectedEnvironment.environmentId;
		}

		let targetServer: Server | undefined;
		if (!serverId) {
			const answer = await inquirer.prompt<{ serverMode: "local" | "remote" }>([
				{
					choices: [
						{ name: "Local Dokploy host", value: "local" },
						{ name: "Remote Dokploy server", value: "remote" },
					],
					message: "Where should this compose service run?",
					name: "serverMode",
					type: "list",
				},
			]);

			if (answer.serverMode === "remote") {
				const servers = await getServers(auth, this);
				const remoteAnswer = await inquirer.prompt<{ serverId: string }>([
					{
						choices: servers.map((item) => ({
							name: `${item.name} (${item.ipAddress}:${item.port})`,
							value: item.serverId,
						})),
						message: "Select a remote server:",
						name: "serverId",
						type: "list",
					},
				]);
				serverId = remoteAnswer.serverId;
				targetServer = servers.find((item) => item.serverId === serverId);
			}
		} else {
			const servers = await getServers(auth, this);
			targetServer = servers.find((item) => item.serverId === serverId);
		}

		if (!name || !sourceType) {
			const answer = await inquirer.prompt<Answers>([
				{
					default: name,
					message: "Compose service name:",
					name: "name",
					type: "input",
					validate: (input) => (input ? true : "Compose service name is required"),
				},
				{
					default: description,
					message: "Description (optional):",
					name: "description",
					type: "input",
				},
				{
					choices: [
						{ name: "Raw compose file", value: "raw" },
						{ name: "GitHub repository", value: "github" },
					],
					default: sourceType,
					message: "Select source type:",
					name: "sourceType",
					type: "list",
				},
			]);
			name = answer.name;
			description = answer.description;
			sourceType = answer.sourceType;
		}

		if (sourceType === "raw" && !composeFile) {
			const answer = await inquirer.prompt<{ composeFilePath: string }>([
				{
					message: "Path to docker-compose file:",
					name: "composeFilePath",
					type: "input",
					validate: (input) => (input ? true : "Compose file path is required"),
				},
			]);
			composeFile = answer.composeFilePath;
		}

		if (sourceType === "github" && (!owner || !repository || !branch || !githubId)) {
			const answer = await inquirer.prompt<Answers>([
				{
					default: owner,
					message: "GitHub owner:",
					name: "owner",
					type: "input",
					validate: (input) => (input ? true : "Owner is required"),
				},
				{
					default: repository,
					message: "GitHub repository:",
					name: "repository",
					type: "input",
					validate: (input) => (input ? true : "Repository is required"),
				},
				{
					default: branch || "main",
					message: "Git branch:",
					name: "branch",
					type: "input",
					validate: (input) => (input ? true : "Branch is required"),
				},
				{
					default: githubId,
					message: "Dokploy GitHub provider ID:",
					name: "githubId",
					type: "input",
					validate: (input) => (input ? true : "GitHub provider ID is required"),
				},
				{
					default: composePath || "./docker-compose.yml",
					message: "Compose path inside the repository:",
					name: "composePath",
					type: "input",
				},
			]);
			owner = answer.owner;
			repository = answer.repository;
			branch = answer.branch;
			githubId = answer.githubId;
			composePath = answer.composePath || "./docker-compose.yml";
		}

		if (!flags.skipConfirm) {
			const confirm = await inquirer.prompt<{ proceed: boolean }>([
				{
					default: false,
					message: "Do you want to create this compose service?",
					name: "proceed",
					type: "confirm",
				},
			]);

			if (!confirm.proceed) {
				this.error(chalk.yellow("Compose creation cancelled."));
				return;
			}
		}

		const composeFileContent =
			sourceType === "raw" && composeFile ? fs.readFileSync(composeFile, "utf8") : "";

		const created = await trpcMutation<{
			composeId: string;
			name: string;
		}>(auth, "compose.create", {
			name,
			description: description || "",
			environmentId,
			composeType,
			serverId,
			composeFile: composeFileContent,
		});

		const updatePayload: Record<string, unknown> = {
			composeId: created.composeId,
			sourceType,
			composeType,
		};

		if (composeFileContent) {
			updatePayload.composeFile = composeFileContent;
		}
		if (envFile) {
			updatePayload.env = fs.readFileSync(envFile, "utf8");
		}
		if (sourceType === "github") {
			updatePayload.owner = owner;
			updatePayload.repository = repository;
			updatePayload.branch = branch;
			updatePayload.githubId = githubId;
			updatePayload.composePath = composePath;
		}

		await trpcMutation(auth, "compose.update", updatePayload);

		const targetLabel = targetServer
			? `${targetServer.name} (${targetServer.ipAddress}:${targetServer.port})`
			: "local Dokploy host";

		this.log(
			chalk.green(
				`Compose '${created.name}' created successfully for ${targetLabel}.`,
			),
		);
		this.log(chalk.green(`Compose ID: ${created.composeId}`));
	}
}
