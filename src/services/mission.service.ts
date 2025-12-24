// src/services/mission.service.ts

import { supabase } from '../integrations/supabase.client';
import { ActiveMission, ReportSubmission } from '../types/line-event';

// ==================== 任務服務 ====================

/**
 * 任務服務
 * 負責：
 * - 查詢使用者的進行中任務
 * - 提交任務進度
 * - 驗證使用者是否可回報該任務
 */
export class MissionService {

  // ==================== 查詢任務 ====================

  /**
   * 取得使用者當前進行中的任務（尚未完成）
   * @param userId - LINE user_id（需要先對應到 users 表的 user_id）
   * @returns 進行中的任務列表
   */
  async getActiveMissions(userId: string): Promise<ActiveMission[]> {
    try {
      // 📌 注意：這裡的 userId 是 LINE user_id
      // 需要先查詢 users 表，取得對應的 user_id
      const { data: user } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!user) {
        console.log(`ℹ️ 使用者 ${userId} 不存在於 users 表中`);
        return [];
      }

      // 查詢使用者所有進行中且未完成的派遣
      const { data, error } = await supabase
        .from('assignment_members')
        .select(`
          id,
          role,
          completed_at,
          assignment:mission_assignments!inner(
            id,
            assignment_number,
            assigned_at,
            mission:missions!inner(
              id,
              mission_title,
              mission_type,
              status
            )
          )
        `)
        .eq('user_id', user.user_id)
        .is('completed_at', null)
        .eq('assignment.mission.status', 'active')
        .order('assignment.assigned_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // 轉換資料格式
      const missions: ActiveMission[] = data.map((item: any) => ({
        mission_id: item.assignment.mission.id,
        mission_title: item.assignment.mission.mission_title,
        mission_type: item.assignment.mission.mission_type,
        assignment_number: item.assignment.assignment_number,
        assignment_id: item.assignment.id,
        role: item.role,
        completed_at: item.completed_at,
        assigned_at: item.assignment.assigned_at
      }));

      return missions;
    } catch (error) {
      console.error('❌ 取得進行中任務失敗:', error);
      return [];
    }
  }

  /**
   * 驗證使用者是否可回報該任務
   * @param userId - LINE user_id
   * @param missionId - 任務 ID
   * @param assignmentNumber - 派遣編號
   * @returns 是否可回報
   */
  async canUserReport(
    userId: string,
    missionId: string,
    assignmentNumber: number
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!user) return false;

      const { data, error } = await supabase
        .from('assignment_members')
        .select(`
          id,
          completed_at,
          assignment:mission_assignments!inner(
            assignment_number,
            mission_id
          )
        `)
        .eq('user_id', user.user_id)
        .eq('assignment.mission_id', missionId)
        .eq('assignment.assignment_number', assignmentNumber)
        .is('completed_at', null)
        .single();

      if (error || !data) return false;

      return true;
    } catch (error) {
      console.error('❌ 驗證使用者權限失敗:', error);
      return false;
    }
  }

  // ==================== 提交進度 ====================

  /**
   * 提交任務進度
   * @param submission - 回報資料
   * @returns 提交結果
   */
  async submitProgress(submission: ReportSubmission): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 1. 取得使用者資料
      const { data: user } = await supabase
        .from('users')
        .select('user_id, display_name')
        .eq('user_id', submission.userId)
        .single();

      if (!user) {
        return {
          success: false,
          message: '❌ 使用者不存在'
        };
      }

      // 2. 驗證權限
      const canReport = await this.canUserReport(
        submission.userId,
        submission.missionId,
        submission.assignmentNumber
      );

      if (!canReport) {
        return {
          success: false,
          message: '❌ 您沒有權限回報此任務或任務已完成'
        };
      }

      // 3. 取得 assignment_id
      const { data: assignment } = await supabase
        .from('mission_assignments')
        .select('id')
        .eq('mission_id', submission.missionId)
        .eq('assignment_number', submission.assignmentNumber)
        .single();

      if (!assignment) {
        return {
          success: false,
          message: '❌ 找不到該派遣階段'
        };
      }

      // 4. 插入進度記錄
      const { error: insertError } = await supabase
        .from('mission_progress')
        .insert({
          mission_id: submission.missionId,
          user_id: user.user_id,
          assignment_id: assignment.id,
          status: submission.status,
          note: submission.note,
          timestamp: new Date().toISOString(),
          reporter_name: user.display_name || '未知',
          source: submission.source,
          line_message_id: submission.lineMessageId
        });

      if (insertError) throw insertError;

      // 5. 如果狀態是「已完成」，更新 assignment_members
      if (submission.status === '已完成') {
        // 📌 這裡需要處理隊長/成員的邏輯
        // 目前先簡化：只更新回報者自己
        const { error: updateError } = await supabase
          .from('assignment_members')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', user.user_id)
          .eq('assignment_id', assignment.id);

        if (updateError) {
          console.error('❌ 更新完成狀態失敗:', updateError);
        }
      }

      console.log('✅ 任務進度提交成功');

      return {
        success: true,
        message: '✅ 回報成功'
      };
    } catch (error) {
      console.error('❌ 提交任務進度失敗:', error);
      return {
        success: false,
        message: '❌ 系統錯誤，請稍後再試'
      };
    }
  }
}

// ==================== 匯出單例 ====================

export const missionService = new MissionService();