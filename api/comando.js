export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { texto } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada na Vercel." });
    }

    if (!texto) {
      return res.status(400).json({ error: "Texto do comando não enviado." });
    }

    const prompt = `
    Você é o assistente inteligente de uma Central de Estudos Universitária.
    O usuário enviará uma frase em linguagem natural, gírias ou português informal sobre os estudos.
    Sua função é interpretar a intenção e responder EXCLUSIVAMENTE em formato JSON puro (sem marcação Markdown \`\`\`json ou texto adicional).

    Ações possíveis:
    - "CRIAR_PROVA" (parametros: titulo, disciplina, data [YYYY-MM-DD])
    - "CRIAR_TAREFA" (parametros: titulo, disciplina, data [YYYY-MM-DD])
    - "CRIAR_DISCIPLINA" (parametros: nome, professor)
    - "REGISTRAR_ESTUDO" (parametros: disciplina, minutos)
    - "INICIAR_TIMER"
    - "PAUSAR_TIMER"
    - "REINICIAR_TIMER"
    - "DELETAR_PROVAS"
    - "DELETAR_DISCIPLINAS"
    - "DELETAR_TAREFAS"
    - "DESCONHECIDO"

    Data de hoje para referência: ${new Date().toISOString().split('T')[0]}

    Entrada do usuário: "${texto}"

    Responda APENAS com o JSON no formato:
    {"acao": "NOME_DA_ACAO", "parametros": {...}}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const apiData = await response.json();
    const rawAnswer = apiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      ?.replace(/^```json/g, '')
      ?.replace(/```$/g, '')
      ?.trim();

    if (!rawAnswer) {
      return res.status(500).json({ error: "Resposta inválida da API do Gemini", details: apiData });
    }

    const parsed = JSON.parse(rawAnswer);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: "Erro ao processar comando", details: err.message });
  }
}
