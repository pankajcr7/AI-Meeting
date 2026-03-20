import path from 'path';
import Meeting from '../models/Meeting';
import ActionItem from '../models/ActionItem';
import {
  transcribeAudio,
  summarizeMeeting,
  extractActionItems,
} from './openaiService';

export async function processMeeting(meetingId: string): Promise<void> {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new Error('Meeting not found');

  try {
    meeting.status = 'transcribing';
    await meeting.save();

    const audioPath = path.join(__dirname, '../../uploads', meeting.audioUrl!);
    const transcript = await transcribeAudio(audioPath);
    meeting.transcript = transcript;

    meeting.status = 'summarizing';
    await meeting.save();

    const summary = await summarizeMeeting(transcript);
    meeting.summary = summary;

    let actionItems = await extractActionItems(transcript, summary);

    if (actionItems.length === 0) {
      try {
        actionItems = await extractActionItems(transcript, summary);
      } catch {
        console.warn(
          `Action item retry failed for meeting ${meetingId}, proceeding with 0 items`
        );
      }
    }

    for (const item of actionItems) {
      await ActionItem.create({
        meeting: meeting._id,
        team: meeting.team,
        title: item.title,
        description: item.description,
        assignee: item.assignee,
        deadline: item.deadline ? new Date(item.deadline) : undefined,
        priority: item.priority || 'medium',
        status: 'pending',
      });
    }

    meeting.status = 'completed';
    meeting.processedAt = new Date();
    await meeting.save();
  } catch (error: any) {
    meeting.status = 'failed';
    meeting.errorMessage = error.message || 'Processing failed';
    await meeting.save();
    throw error;
  }
}
