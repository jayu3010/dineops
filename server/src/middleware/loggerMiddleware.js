// Logger Middleware
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  // Log incoming request
  console.log(`
╔════════════════════════════════════════════════════════════╗
✈️  ${req.method.toUpperCase()} REQUEST
📍 ${req.path}
🕐 ${new Date().toLocaleTimeString()}
╠════════════════════════════════════════════════════════════╝
`);

  // Log request details
  if (Object.keys(req.body).length > 0) {
    console.log('📦 BODY:', JSON.stringify(req.body, null, 2));
  }

  if (Object.keys(req.query).length > 0) {
    console.log('❓ QUERY:', JSON.stringify(req.query, null, 2));
  }

  if (Object.keys(req.params).length > 0) {
    console.log('🔗 PARAMS:', JSON.stringify(req.params, null, 2));
  }

  if (req.headers.authorization) {
    console.log('🔐 AUTH:', req.headers.authorization.substring(0, 30) + '...');
  }

  // Override send to log response
  res.send = function (data) {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';

    console.log(`
╠════════════════════════════════════════════════════════════
${statusEmoji} RESPONSE (${res.statusCode}) - ${duration}ms
╠════════════════════════════════════════════════════════════╝
`);

    // Try to parse and log response data
    try {
      if (typeof data === 'string' && data.length > 0) {
        const parsed = JSON.parse(data);
        console.log('📄 DATA:', JSON.stringify(parsed, null, 2));
      } else if (typeof data === 'object') {
        console.log('📄 DATA:', JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log('📄 DATA:', data);
    }

    console.log(`
╚════════════════════════════════════════════════════════════╝
`);

    originalSend.call(this, data);
  };

  next();
};

module.exports = loggerMiddleware;
