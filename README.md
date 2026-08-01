# BI PARA TODOS — instalação

1. No Supabase, abra **SQL Editor > New query**, cole o conteúdo de `supabase-setup.sql` e clique em **Run**.
2. Em **Settings > API Keys**, copie apenas a chave `sb_publishable_...`.
3. Abra `config.js` e substitua `COLE_AQUI_A_PUBLISHABLE_KEY`. Nunca use `sb_secret_...`.
4. No GitHub, substitua os ficheiros antigos pelos ficheiros desta pasta e faça **Commit changes**. A Vercel publicará automaticamente.
5. Teste uma assinatura e confirme em **Table Editor > assinaturas**.

Privacidade: o público pode inserir assinaturas e consultar apenas números agregados; nomes individuais não ficam públicos.

Limitação: sem email, telefone ou autenticação, não é possível garantir uma assinatura por pessoa. O sistema bloqueia apenas uma segunda assinatura no mesmo navegador.
