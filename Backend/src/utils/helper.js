
//hash tokens
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const revokeTokenChain = async (tokenId) => {
  const [rows] = await pool.query(
    `SELECT id, replaced_by FROM refresh_tokens WHERE id = ?`,
    [tokenId]
  );
  if (rows.length === 0) return;

  await pool.query(`UPDATE refresh_tokens SET is_revoked = true WHERE id = ?`, [tokenId]);

  if (rows[0].replaced_by) {
    await revokeTokenChain(rows[0].replaced_by);
  }
}