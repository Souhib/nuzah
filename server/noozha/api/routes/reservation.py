"""Reservation CRUD + pricing-preview routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from noozha.api.controllers.reservation import ReservationController
from noozha.api.dependencies import AdminDep, SessionDep, get_current_admin
from noozha.api.schemas.reservation import (
    EstimateRequest,
    PriceBreakdown,
    ReservationCreate,
    ReservationListResponse,
    ReservationResponse,
    ReservationUpdate,
)

router = APIRouter(
    prefix="/reservations",
    tags=["Reservations"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=ReservationListResponse)
async def list_reservations(
    session: SessionDep,
    _admin: AdminDep,
    from_: Annotated[str | None, Query(alias="from")] = None,
    to: str | None = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    customer_phone: str | None = None,
    customer_name: str | None = None,
) -> ReservationListResponse:
    """List reservations, optionally filtered by date range, status, or customer."""
    rows = await ReservationController.list_(
        session,
        from_iso=from_,
        to_iso=to,
        status=status_filter,
        customer_phone=customer_phone,
        customer_name=customer_name,
    )
    return ReservationListResponse(reservations=rows)  # type: ignore[arg-type]


@router.post(
    "",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reservation(
    payload: ReservationCreate,
    session: SessionDep,
    _admin: AdminDep,
) -> ReservationResponse:
    """Create a reservation. The server computes the total price."""
    row = await ReservationController.create(session, payload)
    return ReservationResponse.model_validate(row)


@router.post("/estimate", response_model=PriceBreakdown)
async def estimate(payload: EstimateRequest, _admin: AdminDep) -> PriceBreakdown:
    """Live price preview — same math as `POST /reservations` but no persistence."""
    return ReservationController.estimate(payload)


@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: UUID,
    session: SessionDep,
    _admin: AdminDep,
) -> ReservationResponse:
    row = await ReservationController.get(session, reservation_id)
    return ReservationResponse.model_validate(row)


@router.patch("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: UUID,
    payload: ReservationUpdate,
    session: SessionDep,
    _admin: AdminDep,
) -> ReservationResponse:
    """Partial update. Total price is always recomputed server-side."""
    row = await ReservationController.update(session, reservation_id, payload)
    return ReservationResponse.model_validate(row)


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(
    reservation_id: UUID,
    session: SessionDep,
    _admin: AdminDep,
) -> None:
    await ReservationController.delete(session, reservation_id)
