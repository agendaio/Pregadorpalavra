const errorBody = {
  success: false,
  tests: [
    {name: 'Formato da chave', passed: true, message: 'Formato valido'},
    {name: 'Autenticacao e resposta', passed: false, message: 'Incorrect API key provided: sk-proj-***alIA'},
    {name: 'Velocidade media', passed: true, message: 'Excelente (199ms)', latencyMs: 199},
    {name: 'Conectividade', passed: true, message: 'Conexao estabelecida com sucesso'}
  ],
  latencyMs: 199,
  model: 'gpt-4o-mini'
};

const error = {
  message: 'Function returned a non-2xx status code',
  status: 422,
  context: { body: errorBody }
};

const status = error?.context?.status;
const errBody = error?.context?.body;

console.log('status:', status);
console.log('errBody?.tests:', errBody?.tests);

// Simular a lógica do testarChave
let msg = errBody?.message ?? error?.message ?? String(error ?? '');
if (errBody?.tests && Array.isArray(errBody.tests)) {
  console.log('-> IF: Mostrar testes!');
  console.log('tests:', JSON.stringify(errBody.tests, null, 2));
} else {
  console.log('-> ELSE: msg generica =', msg);
}
