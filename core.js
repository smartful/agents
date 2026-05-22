class Tool {
  constructor(name, func) {
    this.name = name;
    this.func = func;
  }

  async execute(input) {
    return await this.func(input);
  }
}
