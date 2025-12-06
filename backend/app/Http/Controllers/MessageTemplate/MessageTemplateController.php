<?php

namespace App\Http\Controllers\MessageTemplate;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use App\Services\MessageTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Message Template Controller
 *
 * Handles CRUD operations for message templates.
 */
class MessageTemplateController extends Controller
{
    /**
     * The message template service instance.
     *
     * @var MessageTemplateService
     */
    protected MessageTemplateService $templateService;

    /**
     * Create a new controller instance.
     *
     * @param MessageTemplateService $templateService
     */
    public function __construct(MessageTemplateService $templateService)
    {
        $this->templateService = $templateService;
    }

    /**
     * Get all message templates for the authenticated user.
     *
     * Optional query parameter: type (invitation|message) to filter templates.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type'); // Optional filter

        $templates = $this->templateService->getUserTemplates(
            $request->user(),
            $type
        );

        return response()->json([
            'templates' => $templates,
        ]);
    }

    /**
     * Create a new message template.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:invitation,message',
            'content' => 'required|string|max:5000',
        ]);

        // Additional validation for invitation messages (300 char limit)
        if ($validated['type'] === 'invitation' && mb_strlen($validated['content']) > 300) {
            return response()->json([
                'message' => 'Invitation messages must be 300 characters or less',
                'errors' => [
                    'content' => ['Invitation messages have a 300 character limit']
                ]
            ], 422);
        }

        $template = $this->templateService->createTemplate(
            $request->user(),
            $validated
        );

        return response()->json([
            'message' => 'Template created successfully',
            'template' => $template,
        ], 201);
    }

    /**
     * Get a single message template.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $template = $this->templateService->getUserTemplate($request->user(), $id);

        if (!$template) {
            return response()->json([
                'message' => 'Template not found'
            ], 404);
        }

        return response()->json([
            'template' => $template,
        ]);
    }

    /**
     * Update an existing message template.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $template = $request->user()->messageTemplates()->find($id);

        if (!$template) {
            return response()->json([
                'message' => 'Template not found'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string|max:5000',
        ]);

        // Additional validation for invitation messages (300 char limit)
        if (isset($validated['content']) && $template->type === 'invitation' && mb_strlen($validated['content']) > 300) {
            return response()->json([
                'message' => 'Invitation messages must be 300 characters or less',
                'errors' => [
                    'content' => ['Invitation messages have a 300 character limit']
                ]
            ], 422);
        }

        $template = $this->templateService->updateTemplate($template, $validated);

        return response()->json([
            'message' => 'Template updated successfully',
            'template' => $template,
        ]);
    }

    /**
     * Delete a message template.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $template = $request->user()->messageTemplates()->find($id);

        if (!$template) {
            return response()->json([
                'message' => 'Template not found'
            ], 404);
        }

        $this->templateService->deleteTemplate($template);

        return response()->json([
            'message' => 'Template deleted successfully',
        ]);
    }

    /**
     * Bulk delete message templates.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_ids' => 'required|array',
            'template_ids.*' => 'required|integer|exists:message_templates,id',
        ]);

        $deleted = $this->templateService->bulkDelete(
            $request->user(),
            $validated['template_ids']
        );

        return response()->json([
            'message' => 'Templates deleted successfully',
            'deleted' => $deleted,
        ]);
    }
}
