export const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
}

export const createTaskBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    assignedAgentId: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
  },
}

export const updateTaskBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    status: { type: 'string', minLength: 1 },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    assignedAgentId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    blockerReason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    metadata: { type: 'object', additionalProperties: true },
  },
}

export const assignTaskBodySchema = {
  type: 'object',
  required: ['agentId'],
  properties: {
    agentId: { type: 'string', minLength: 1 },
  },
}

export const retryTaskBodySchema = {
  type: 'object',
  properties: {
    reason: { type: 'string' },
  },
}

export const sessionMessageBodySchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string', minLength: 1 },
  },
}

export const sessionStopBodySchema = {
  type: 'object',
  properties: {
    reason: { type: 'string' },
  },
}

export const chatMessageBodySchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string', minLength: 1, maxLength: 4000 },
    sessionId: { type: 'string' },
    deliver: { type: 'boolean' },
    channel: { type: 'string' },
    replyTo: { type: 'string' },
  },
}

export const agentIdParamSchema = {
  type: 'object',
  required: ['agentId'],
  properties: {
    agentId: { type: 'string', minLength: 1 },
  },
}
