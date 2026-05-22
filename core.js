class Tool {
  constructor(name, func) {
    this.name = name;
    this.func = func;
  }

  async execute(input) {
    return await this.func(input);
  }
}

class Agent {
  constructor(name, tools = [], prompt = "") {
    this.name = name;
    this.tools = tools;
    this.prompt = prompt;
  }

  async perform(task, onProgress = null) {
    // Recherche de l'outil
    const tool = this.tools.find((t) => t.name === task.toolName);

    if (!tool) {
      const error = `Tool : ${task.toolName} non trouvé pour l'agent ${this.name}`;
      if (onProgress) {
        onProgress({
          type: "log",
          level: "error",
          message: error,
        });
      }
      throw new Error(error);
    }

    if (onProgress) {
      onProgress({
        type: "log",
        level: "info",
        message: `Agent ${this.name} utilise l'outil : ${tool.name} `,
      });
    }

    try {
      // Exécuter l'outil
      const result = await tool.execute(task.input);
      return result;
    } catch (error) {
      if (onProgress) {
        onProgress({
          type: "log",
          level: "error",
          message: `Erreur avec l'outil ${tool.name}: ${error.message}`,
        });
      }
      throw error;
    }
  }
}
