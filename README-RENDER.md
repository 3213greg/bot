# Discord Bot - Minecraft Clan

Bot Discord z systemem weryfikacji, ticketów i moderacji.

## Deployment na Render.com

### Zmienne środowiskowe (Environment Variables):

Dodaj te zmienne w panelu Render:

```
DISCORD_TOKEN=twoj_token
GUILD_ID=id_serwera
WELCOME_CHANNEL_ID=id_kanalu
LOBBY_CHANNEL_ID=id_kanalu
VERIFICATION_CHANNEL_ID=id_kanalu
TICKET_CATEGORY_ID=id_kategorii
LOGS_CHANNEL_ID=id_kanalu
TICKET_ARCHIVE_CATEGORY_ID=id_kategorii
VERIFIED_ROLE_ID=id_roli
MODERATOR_ROLE_ID=id_roli
ADMIN_ROLE_ID=id_roli
```

### Start Command:
```
npm start
```
