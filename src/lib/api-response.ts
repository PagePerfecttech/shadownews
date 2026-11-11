import { NextResponse } from 'next/server'

/**
 * Standardized API response format
 * All endpoints should return responses in this format for consistency
 */

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    timestamp: string
    version: string
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
  meta?: {
    timestamp: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        ...meta,
      },
    },
    { status }
  )
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

/**
 * Common error responses
 */

export function badRequest(message: string, details?: Record<string, any>) {
  return errorResponse('BAD_REQUEST', message, 400, details)
}

export function unauthorized(message: string = 'Unauthorized') {
  return errorResponse('UNAUTHORIZED', message, 401)
}

export function forbidden(message: string = 'Forbidden') {
  return errorResponse('FORBIDDEN', message, 403)
}

export function notFound(message: string = 'Not found') {
  return errorResponse('NOT_FOUND', message, 404)
}

export function conflict(message: string, details?: Record<string, any>) {
  return errorResponse('CONFLICT', message, 409, details)
}

export function rateLimit(retryAfter?: number) {
  const response = errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.', 429)
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter))
  }
  return response
}

export function internalError(message: string = 'Internal server error') {
  return errorResponse('INTERNAL_ERROR', message, 500)
}

/**
 * List response with pagination metadata
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
    totalPages: number
    currentPage: number
  }
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
  status: number = 200
): NextResponse<ApiSuccessResponse<PaginatedResponse<T>>> {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const hasMore = offset + limit < total

  return successResponse({
    items,
    pagination: {
      limit,
      offset,
      total,
      hasMore,
      totalPages,
      currentPage,
    },
  }, status)
}
