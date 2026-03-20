import Integration from '../models/Integration';
import { IActionItem } from '../models/ActionItem';
import { syncActionItemToSlack } from './slackService';
import { syncActionItemToNotion } from './notionService';
import { syncActionItemToAsana } from './asanaService';

export async function autoSyncActionItems(
  teamId: string,
  actionItems: IActionItem[]
): Promise<void> {
  try {
    const integrations = await Integration.find({
      team: teamId,
      'settings.autoSync': true,
    });

    if (integrations.length === 0) return;

    for (const item of actionItems) {
      for (const integration of integrations) {
        try {
          if (integration.type === 'slack' && integration.settings.channelId) {
            await syncActionItemToSlack(integration, item);
          } else if (integration.type === 'notion' && integration.settings.databaseId) {
            await syncActionItemToNotion(integration, item);
          } else if (integration.type === 'asana' && integration.settings.projectId) {
            await syncActionItemToAsana(integration, item);
          }
        } catch (error: any) {
          console.error(
            `Auto-sync failed for ${integration.type} (item: ${item._id}): ${error.message}`
          );
        }
      }
    }
  } catch (error: any) {
    console.error(`Auto-sync lookup failed for team ${teamId}: ${error.message}`);
  }
}
