import { useMemo, useState } from 'react';
import type { GitProjectInfo, GitTaskItem } from '../../../../shared/types';
import { generateTaskBranchName, parseTaskInput, validateBranchName } from '../../utils/gitPageUtils';
import { taskBranchPrefixForType } from '../../utils/gitViewUtils';
import type { GitOutputControls } from './useGitOutput';

interface Params extends GitOutputControls {
  currentProject: GitProjectInfo | undefined;
  refreshAfterGitChange: (projectPath: string) => Promise<void>;
}

/** Criação de branch vinculada a uma tarefa (Azure DevOps / Jira). */
export function useGitTaskBranch({ currentProject, setGitOutput, setGitOutputIsError, refreshAfterGitChange }: Params) {
  const [isTaskBranchModalOpen, setIsTaskBranchModalOpen] = useState<boolean>(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [taskItems, setTaskItems] = useState<GitTaskItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<GitTaskItem | null>(null);

  const [taskBranchPrefix, setTaskBranchPrefix] = useState<string>('feature/');
  const [taskBranchId, setTaskBranchId] = useState<string>('');
  const [taskBranchTitle, setTaskBranchTitle] = useState<string>('');
  const [taskBaseBranch, setTaskBaseBranch] = useState<string>('develop');
  const [taskRawInput, setTaskRawInput] = useState<string>('');
  const [isCreatingTaskBranch, setIsCreatingTaskBranch] = useState<boolean>(false);
  const [taskBranchError, setTaskBranchError] = useState<string | null>(null);

  const handleTaskRawInputChange = (val: string) => {
    setTaskRawInput(val);
    const parsed = parseTaskInput(val);
    if (parsed.taskId) setTaskBranchId(parsed.taskId);
    if (parsed.taskTitle) setTaskBranchTitle(parsed.taskTitle);
  };

  const handleSearchTasks = async (query?: string) => {
    if (!currentProject || !window.electronAPI?.fetchTasks) return;
    setIsLoadingTasks(true);
    try {
      const tasks = await window.electronAPI.fetchTasks(currentProject.path, query);
      setTaskItems(tasks || []);
    } catch (err) {
      console.warn('[Git] Erro ao buscar tarefas integradas:', err);
      setTaskItems([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleSelectTask = (task: GitTaskItem) => {
    setSelectedTask(task);
    setTaskBranchId(task.id);
    setTaskBranchTitle(task.title);
    setTaskBranchPrefix(taskBranchPrefixForType(task.type));
  };

  const computedTaskBranchName = useMemo(() => {
    return generateTaskBranchName({
      prefix: taskBranchPrefix,
      taskId: taskBranchId,
      title: taskBranchTitle
    });
  }, [taskBranchPrefix, taskBranchId, taskBranchTitle]);

  const taskBranchValidation = useMemo(() => {
    return validateBranchName(computedTaskBranchName);
  }, [computedTaskBranchName]);

  const closeTaskBranchModal = () => {
    setIsTaskBranchModalOpen(false);
    setTaskBranchError(null);
    setTaskSearchQuery('');
  };

  const openTaskBranchModal = () => {
    if (currentProject) {
      setTaskBaseBranch(currentProject.currentBranch);
    }
    setIsTaskBranchModalOpen(true);
    handleSearchTasks();
  };

  const handleCreateTaskBranch = async () => {
    if (!currentProject || !taskBranchValidation.valid || isCreatingTaskBranch) return;
    setIsCreatingTaskBranch(true);
    setTaskBranchError(null);
    try {
      const res = await window.electronAPI.createTaskBranch(currentProject.path, {
        prefix: taskBranchPrefix,
        taskId: taskBranchId,
        title: taskBranchTitle,
        baseBranch: taskBaseBranch || undefined
      });
      if (res.success) {
        closeTaskBranchModal();
        setTaskRawInput('');
        setTaskBranchId('');
        setTaskBranchTitle('');
        setSelectedTask(null);
        setGitOutput(`Branch '${res.branchName}' criada com sucesso a partir de '${taskBaseBranch}'!`);
        setGitOutputIsError(false);
        await refreshAfterGitChange(currentProject.path);
      } else {
        setTaskBranchError(res.output);
      }
    } catch (err: any) {
      setTaskBranchError(err?.message || 'Falha ao criar branch de tarefa.');
    } finally {
      setIsCreatingTaskBranch(false);
    }
  };

  return {
    isTaskBranchModalOpen,
    taskSearchQuery,
    taskItems,
    isLoadingTasks,
    selectedTask,
    taskBranchPrefix,
    setTaskBranchPrefix,
    taskBranchId,
    setTaskBranchId,
    taskBranchTitle,
    setTaskBranchTitle,
    taskBaseBranch,
    setTaskBaseBranch,
    taskRawInput,
    isCreatingTaskBranch,
    taskBranchError,
    computedTaskBranchName,
    taskBranchValidation,
    handleTaskRawInputChange,
    handleSearchTasks,
    handleSelectTask,
    closeTaskBranchModal,
    openTaskBranchModal,
    handleCreateTaskBranch
  };
}
